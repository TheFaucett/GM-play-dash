import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Player } from "../types/player";

// ✅ NEW: use real roster validator instead of heuristic checks
import { deriveRosterView } from "./deriveRosterView";
import { validateRosterView } from "./validateRosterView";

type InboxItemKind = "PENDING" | "ALERT" | "TODAY" | "FEED";

export type InboxItem = {
  id: string;
  kind: InboxItemKind;
  title: string;
  body?: string;
  refs?: EntityId[];
  ts: number;
  severity?: "info" | "warn" | "danger";
  actionHint?: {
    type: "SELECT_PLAYER" | "OPEN_FA" | "OPEN_ROSTER" | "NONE";
    payload?: any;
    label?: string;
  };
};

export type FrontOfficeInbox = {
  pending: InboxItem[];
  alerts: InboxItem[];
  today: InboxItem[];
  feed: InboxItem[];
};

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function safeObj(v: unknown): Record<string, any> {
  return v && typeof v === "object" ? (v as any) : {};
}

function nowish(state: LeagueState) {
  const last = state.log?.[state.log.length - 1]?.timestamp;
  return typeof last === "number" ? last : Date.now();
}

function minutesAgo(ms: number) {
  return Math.floor(ms / 60000);
}

function humanizeTime(deltaMs: number) {
  if (deltaMs < 60000) return "just now";
  const m = minutesAgo(deltaMs);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function violationTone(code: string): "info" | "warn" | "danger" {
  // Hard blockers
  if (
    code === "ACTIVE_OVER_26" ||
    code === "FORTY_OVER_40" ||
    code === "NO_40_MAN_SPACE" ||
    code === "NO_26_MAN_SPACE"
  ) {
    return "danger";
  }

  // Soft blockers / warnings
  if (
    code === "MLB_NOT_ON_40" ||
    code === "DEPTH_CHART_PLAYER_NOT_ON_TEAM" ||
    code === "NEEDS_WAIVERS"
  ) {
    return "warn";
  }

  return "info";
}

function prettyCode(code: string) {
  return code.replaceAll("_", " ");
}

/**
 * Derive a front office inbox from:
 * - ✅ roster violations (REAL validator)
 * - pending FA offers (best-effort lookup)
 * - recent log events (signings, rejections, trades, roster moves)
 *
 * This is intentionally “debug-friendly”: it reveals state changes and blockers.
 */
export function deriveFrontOfficeInbox(
  state: LeagueState,
  userTeamId: EntityId
): FrontOfficeInbox {
  const items: FrontOfficeInbox = {
    pending: [],
    alerts: [],
    today: [],
    feed: [],
  };

  const now = nowish(state);

  // -----------------------------
  // A) ROSTER ALERTS (AUTHORITATIVE)
  // -----------------------------
  // Replace heuristic checks with your canonical roster view + validator.
  try {
    const view = deriveRosterView(state, userTeamId);
    const violations = validateRosterView(state, view);

    for (const v of violations) {
      const tone = violationTone(v.code);

      // If there are refs, selecting the first one is almost always useful for debugging
      const firstRef = v.refs?.[0];

      items.alerts.push({
        id: `alert_${v.code}_${userTeamId}_${firstRef ?? "none"}`,
        kind: "ALERT",
        severity: tone,
        title: `${v.code} — ${v.message}`,
        body:
          v.refs && v.refs.length
            ? `Refs: ${v.refs.slice(0, 6).join(", ")}${v.refs.length > 6 ? "…" : ""}`
            : undefined,
        refs: v.refs,
        ts: now,
        actionHint: firstRef
          ? {
              type: "SELECT_PLAYER",
              payload: { playerId: firstRef },
              label: "Select ref",
            }
          : {
              type: "OPEN_ROSTER",
              label: "Open roster tools",
            },
      });
    }
  } catch (err) {
    // If something goes wrong, don’t crash the inbox; surface it.
    items.alerts.push({
      id: `alert_roster_validator_error_${userTeamId}`,
      kind: "ALERT",
      severity: "danger",
      title: "ROSTER_VALIDATION_ERROR",
      body: `Roster validator threw: ${(err as any)?.message ?? String(err)}`,
      refs: [userTeamId],
      ts: now,
      actionHint: { type: "OPEN_ROSTER", label: "Open roster tools" },
    });
  }

  // -----------------------------
  // B) PENDING OFFERS (best-effort)
  // -----------------------------
  // We don't know your exact shape, so we try a few common spots:
  // state.freeAgency.offersByPlayer, state.freeAgency.offers, state.faOffers, state.offers.faOffers, etc.
  const sAny = state as any;

  const offersByPlayer: Record<string, any> =
    safeObj(sAny.freeAgency?.offersByPlayer) ||
    safeObj(sAny.freeAgency?.offers) ||
    safeObj(sAny.faOffers) ||
    safeObj(sAny.offers?.faOffers) ||
    {};

  for (const [playerId, offer] of Object.entries(offersByPlayer)) {
    if (!offer) continue;

    const toTeamId = offer.teamId ?? offer.toTeamId ?? offer.fromTeamId;
    if (toTeamId !== userTeamId) continue;

    const p = state.players[playerId as EntityId] as Player | undefined;
    const name = p?.name ?? playerId;

    items.pending.push({
      id: `pending_offer_${playerId}`,
      kind: "PENDING",
      severity: "info",
      title: `Pending FA offer: ${name}`,
      body: `${offer.years ?? "?"}y • $${offer.aavM ?? offer.aav ?? "?"}M`,
      refs: [playerId as EntityId],
      ts: offer.createdAt ?? now,
      actionHint: {
        type: "SELECT_PLAYER",
        payload: { playerId },
        label: "Select player",
      },
    });
  }

  // -----------------------------
  // C) RECENT LOG DIGEST
  // -----------------------------
  const log = safeArray<any>(state.log);
  const recent = log.slice(-40).reverse();

  for (const e of recent) {
    const ts = typeof e.timestamp === "number" ? e.timestamp : now;
    const age = now - ts;

    const type = String(e.type ?? "LOG");
    const desc = String(e.description ?? "");

    const base: InboxItem = {
      id: String(e.id ?? `log_${type}_${ts}`),
      kind: "FEED",
      ts,
      title: type.replaceAll("_", " "),
      body: desc,
      refs: safeArray<EntityId>(e.refs),
      severity:
        type.includes("BLOCKED") || type.includes("REJECT")
          ? "warn"
          : type.includes("ERROR")
          ? "danger"
          : "info",
    };

    const isImportant =
      type.includes("FA_") ||
      type.includes("TRADE") ||
      type.includes("ROSTER") ||
      type.includes("ADVANCE") ||
      type.includes("PLAYER_RELEASED") ||
      type.includes("SIGN");

    if (isImportant) {
      items.today.push({
        ...base,
        kind: "TODAY",
        title: `${base.title} • ${humanizeTime(age)}`,
      });
    } else {
      items.feed.push({
        ...base,
        kind: "FEED",
        title: `${base.title} • ${humanizeTime(age)}`,
      });
    }
  }

  // Keep lists small and useful
  items.pending = items.pending.slice(0, 10);
  items.alerts = items.alerts.slice(0, 10);
  items.today = items.today.slice(0, 12);
  items.feed = items.feed.slice(0, 12);

  return items;
}