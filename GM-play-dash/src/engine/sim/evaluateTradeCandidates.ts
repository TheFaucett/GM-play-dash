// src/engine/trade/evaluateTradeCandidates.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { PlayerIntent } from "../types/intent";

/* ==============================================
   TYPES
============================================== */

export type TradeCandidateReason =
  | "UNHAPPY"
  | "OUT_OF_PATIENCE"
  | "REBUILDING_TEAM"
  | "MARKET_PRESSURE";

export type TradeCandidate = {
  playerId: EntityId;
  teamId: EntityId;
  reasons: TradeCandidateReason[];
  urgency: number; // 0 → 100
};

/* ==============================================
   CONSTANTS (TUNABLE)
============================================== */

const UNHAPPY_THRESHOLD = -30;
const PATIENCE_THRESHOLD = 14;

/* ==============================================
   MAIN ENTRY
============================================== */

export function evaluateTradeCandidates(
  state: LeagueState
): TradeCandidate[] {
  const results: TradeCandidate[] = [];

  for (const [playerId, intent] of Object.entries(state.playerIntent)) {
    const player = state.players[playerId];
    if (!player) continue;

    const teamId = player.teamId as EntityId;
    if (!teamId || teamId === "FA") continue;

    const teamIntent = state.teamIntent[teamId];
    if (!teamIntent) continue;

    const reasons: TradeCandidateReason[] = [];
    let urgency = 0;

    /* --------------------------------------------
       PLAYER PRESSURE
    -------------------------------------------- */

    if (intent.satisfaction < UNHAPPY_THRESHOLD) {
      reasons.push("UNHAPPY");
      urgency += Math.abs(intent.satisfaction);
    }

    if (intent.patience <= PATIENCE_THRESHOLD) {
      reasons.push("OUT_OF_PATIENCE");
      urgency += (PATIENCE_THRESHOLD - intent.patience) * 2;
    }

    /* --------------------------------------------
       TEAM PRESSURE
    -------------------------------------------- */

    if (teamIntent.direction === "REBUILD") {
      reasons.push("REBUILDING_TEAM");
      urgency += 20;
    }

    /* --------------------------------------------
       MARKET PRESSURE
    -------------------------------------------- */

    const team = state.teams[teamId];
    if (team?.marketSize === "small") {
      reasons.push("MARKET_PRESSURE");
      urgency += 10;
    }

    /* --------------------------------------------
       FINALIZE
    -------------------------------------------- */

    if (reasons.length > 0) {
      results.push({
        playerId: playerId as EntityId,
        teamId,
        reasons,
        urgency: clamp(urgency, 0, 100),
      });
    }
  }

  return results;
}

/* ==============================================
   HELPERS
============================================== */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
