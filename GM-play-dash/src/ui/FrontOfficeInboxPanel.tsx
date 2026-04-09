import React, { useMemo } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Action } from "../engine/actions/types";

import { deriveFrontOfficeInbox } from "../engine/sim/deriveFrontOfficeInbox";

type Props = {
  state: LeagueState;
  dispatch: React.Dispatch<Action> | ((a: Action) => void);
};

const s = {
  card: {
    border: "1px solid #1c1c1c",
    background: "linear-gradient(180deg, #0b0b0b 0%, #090909 100%)",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  } as React.CSSProperties,
  titleRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  } as React.CSSProperties,
  title: { margin: 0, fontSize: 13, fontWeight: 900, opacity: 0.95 } as React.CSSProperties,
  subtle: { opacity: 0.7, fontSize: 12 } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } as React.CSSProperties,
  col: { display: "grid", gap: 10 } as React.CSSProperties,
  sectionTitle: {
    fontWeight: 900,
    fontSize: 12,
    opacity: 0.9,
    letterSpacing: 0.2,
    marginBottom: 6,
  } as React.CSSProperties,
  item: (tone: "info" | "warn" | "danger" = "info"): React.CSSProperties => ({
    border: "1px solid #1b1b1b",
    borderLeft:
      tone === "danger"
        ? "3px solid #ff6666"
        : tone === "warn"
        ? "3px solid #ffcc00"
        : "3px solid #55aaff",
    background: "#0a0a0a",
    borderRadius: 12,
    padding: 10,
  }),
  itemTitle: { fontWeight: 900, fontSize: 12, marginBottom: 4 } as React.CSSProperties,
  itemBody: { opacity: 0.8, fontSize: 12, lineHeight: 1.35 } as React.CSSProperties,
  actionsRow: { marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" } as React.CSSProperties,
  btn: {
    background: "#111",
    color: "#ddd",
    border: "1px solid #2a2a2a",
    padding: "6px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  } as React.CSSProperties,
};

function toTone(sev?: string): "info" | "warn" | "danger" {
  if (sev === "danger") return "danger";
  if (sev === "warn") return "warn";
  return "info";
}

export function FrontOfficeInboxPanel({ state, dispatch }: Props) {
  const userTeamId = state.meta.userTeamId as EntityId | null;

  const inbox = useMemo(() => {
    if (!userTeamId) return null;
    return deriveFrontOfficeInbox(state, userTeamId);
  }, [state, userTeamId]);

  if (!userTeamId || !inbox) {
    return (
      <div style={s.card}>
        <div style={s.titleRow}>
          <h3 style={s.title}>📬 Front Office Inbox</h3>
          <span style={s.subtle}>Select a team to activate</span>
        </div>
        <div style={s.subtle}>No user team selected.</div>
      </div>
    );
  }

  function renderList(label: string, items: any[]) {
    return (
      <div>
        <div style={s.sectionTitle}>{label}</div>

        {items.length === 0 ? (
          <div style={s.subtle}>Nothing here.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it) => {
              const tone = toTone(it.severity);
              return (
                <div key={it.id} style={s.item(tone)}>
                  <div style={s.itemTitle}>{it.title}</div>
                  {it.body ? <div style={s.itemBody}>{it.body}</div> : null}

                  {it.actionHint?.type === "SELECT_PLAYER" && it.actionHint.payload?.playerId ? (
                    <div style={s.actionsRow}>
                      <button
                        style={s.btn}
                        onClick={() =>
                          dispatch({
                            type: "SELECT_PLAYER",
                            payload: { playerId: it.actionHint.payload.playerId },
                          } as Action)
                        }
                      >
                        {it.actionHint.label ?? "Select"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.card}>
      <div style={s.titleRow}>
        <h3 style={s.title}>📬 Front Office Inbox</h3>
        <span style={s.subtle}>
          Pending {inbox.pending.length} • Alerts {inbox.alerts.length}
        </span>
      </div>

      <div style={s.grid}>
        <div style={s.col}>
          {renderList("⚠ Alerts / Blockers", inbox.alerts)}
          {renderList("⏳ Pending", inbox.pending)}
        </div>

        <div style={s.col}>
          {renderList("✅ Decisions / Today", inbox.today)}
          {renderList("📰 League Feed", inbox.feed)}
        </div>
      </div>
    </div>
  );
}