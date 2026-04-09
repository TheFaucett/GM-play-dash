import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { Player, PlayerContract } from "../../types/player";

import { applyRosterMove } from "../../sim/applyRosterMove";
import { getRosterStatus } from "../../sim/getRosterStatus";

/**
 * MVP Free Agency Offer:
 * - user makes an offer (years + AAV)
 * - player accepts/rejects deterministically using value/age/market
 * - accepted: contract attached + player joins team (AAA default) + optional roster ops
 */
export function handleMakeFreeAgentOffer(
  state: LeagueState,
  args: {
    playerId: EntityId;
    toTeamId: EntityId;
    years: number;
    aav: number;
    targetLevel?: "AAA" | "MLB";
    addTo40?: boolean;
  }
): LeagueState {
  const { playerId, toTeamId } = args;

  if (state.meta.phase !== "OFFSEASON") {
    console.warn("⛔ MAKE_FA_OFFER blocked: invalid phase", state.meta.phase);
    return state;
  }

  const player = state.players[playerId] as Player | undefined;
  if (!player) return state;

  if (player.teamId !== ("FA" as EntityId)) {
    console.warn("⛔ MAKE_FA_OFFER blocked: player not FA", playerId);
    return state;
  }

  const team = state.teams[toTeamId];
  if (!team) return state;

  const now = Date.now();
  const seasonId = state.pointers.seasonId as EntityId | undefined;
  const year = seasonId ? state.seasons[seasonId]?.year : undefined;

  // sanitize offer
  const years = Math.max(1, Math.min(10, Math.floor(args.years)));
  const aav = Math.max(0, Math.round(args.aav));

  const targetLevel = args.targetLevel ?? "AAA";
  const addTo40 = args.addTo40 ?? false;

  /* -------------------------------------------------
     1) Determine player's "ask" (very tuneable)
     Uses player.value if present; otherwise a rough fallback.
  ------------------------------------------------- */

  const overall = player.value?.overall ?? 50;

  // age curve for FA leverage (prime gets paid, old gets less)
  const age = player.age ?? 25;
  const ageMult =
    age <= 24 ? 0.85 :
    age <= 27 ? 1.05 :
    age <= 30 ? 1.15 :
    age <= 33 ? 1.00 :
    0.80;

  // base $ from overall (in "millions", then convert)
  // tweak these two numbers to tune your league economy
  const baseAavM = 0.6 + overall * 0.22; // 50->11.6M, 70->16.0M, 90->20.4M
  const askAav = Math.round(baseAavM * ageMult * 1_000_000);

  // contract length preference
  const askYears =
    age <= 24 ? 6 :
    age <= 27 ? 5 :
    age <= 30 ? 4 :
    age <= 33 ? 3 :
    2;

  /* -------------------------------------------------
     2) Team appeal (market size difficulty hook)
     - big markets have an edge
     - small markets require overpay
  ------------------------------------------------- */

  const marketBonus =
    team.marketSize === "large" ? 0.06 :
    team.marketSize === "mid" ? 0.0 :
    -0.06;

  // MLB opportunity bonus (small but real)
  const opportunityBonus = targetLevel === "MLB" ? 0.04 : 0.0;

  // Score the offer vs ask
  const moneyScore = aav / Math.max(1, askAav); // 1.0 means meets ask
  const yearsScore = years / Math.max(1, askYears); // 1.0 means meets length

  // Weighted acceptance score
  const acceptScore =
    moneyScore * 0.78 +
    yearsScore * 0.18 +
    (1 + marketBonus + opportunityBonus) * 0.04;

  // Deterministic threshold:
  // - star players need you closer to their ask
  // - old/low overall are more willing
  const demand = clamp01((overall - 50) / 60); // 50->0, 110->1
  const threshold = 0.96 + demand * 0.08; // 0.96..1.04

  const accepted = acceptScore >= threshold;

  /* -------------------------------------------------
     3) If rejected -> log + return
  ------------------------------------------------- */

  if (!accepted) {
    const why = [
      `Ask ~ $${Math.round(askAav / 1_000_000)}M x${askYears}`,
      `Offer $${Math.round(aav / 1_000_000)}M x${years}`,
      `Market ${team.marketSize}`,
    ].join(" • ");

    return {
      ...state,
      log: [
        ...state.log,
        {
          id: `log_fa_offer_rejected_${playerId}_${toTeamId}_${now}`,
          timestamp: now,
          type: "FA_OFFER_REJECTED",
          refs: [playerId, toTeamId],
          description: `FA offer rejected by ${player.name}. ${why}`,
        },
      ],
    };
  }

  /* -------------------------------------------------
     4) Accepted -> attach contract + sign player
  ------------------------------------------------- */

  const contract: PlayerContract = {
    yearsRemaining: years,
    annualSalary: aav,
    totalValue: aav * years,
    signedYear: year ?? new Date().getFullYear(),
    type: "guaranteed",
  };

  let next: LeagueState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        updatedAt: now,
        teamId: toTeamId,
        level: targetLevel === "MLB" ? "MLB" : "AAA",
        contract,
        history: {
          ...player.history,
          transactions: [
            ...player.history.transactions,
            `SIGNED_FA:${toTeamId}:${years}y@${Math.round(aav / 1_000_000)}M`,
          ],
        },
      },
    },
    log: [
      ...state.log,
      {
        id: `log_fa_offer_accepted_${playerId}_${toTeamId}_${now}`,
        timestamp: now,
        type: "FA_OFFER_ACCEPTED",
        refs: [playerId, toTeamId],
        description: `FA signed: ${player.name} -> ${team.name} (${years}y, $${Math.round(aav / 1_000_000)}M AAV)`,
      },
    ],
  };

  // Optional: remove from playerPool.freeAgents if you still maintain it
  const pool = (next as any).playerPool as { freeAgents: EntityId[] } | undefined;
  if (pool?.freeAgents?.length) {
    next = {
      ...next,
      playerPool: {
        ...pool,
        freeAgents: pool.freeAgents.filter((id) => id !== playerId),
      },
    } as any;
  }

  /* -------------------------------------------------
     5) Optional roster ops (40-man + MLB)
  ------------------------------------------------- */

  const signed = next.players[playerId] as Player;
  const r = getRosterStatus(signed);

  const needs40 = targetLevel === "MLB" || addTo40;

  if (needs40 && !r.on40) {
    const res40 = applyRosterMove(next, { type: "ADD_TO_40", playerId }, { strict: true, now });
    if (res40.ok) next = res40.next;
  }

  if (targetLevel === "MLB") {
    const resMLB = applyRosterMove(next, { type: "PROMOTE_TO_MLB", playerId }, { strict: true, now });
    if (resMLB.ok) next = resMLB.next;
    // if promotion fails (26 full), we let them remain signed in AAA
  }

  return next;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}