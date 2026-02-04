// src/engine/sim/forceTradeProposal.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { TradeProposal } from "../types/trade";

/**
 * DEV-ONLY: Forces a simple 1-for-1 trade proposal
 * between two teams, bypassing evaluation logic.
 *
 * GUARANTEES:
 * - Always returns a proposal if players exist
 * - Deterministic
 * - Never returns null unless rosters are empty
 */
export function forceTradeProposal(
  state: LeagueState,
  fromTeamId: EntityId,
  toTeamId: EntityId
): TradeProposal | null {
  const fromPlayers = Object.values(state.players).filter(
    p => p.teamId === fromTeamId
  );

  const toPlayers = Object.values(state.players).filter(
    p => p.teamId === toTeamId
  );

  if (fromPlayers.length === 0 || toPlayers.length === 0) {
    console.warn("forceTradeProposal: teams have no players");
    return null;
  }

  const fromPlayer = fromPlayers[0];
  const toPlayer = toPlayers[0];

  return {
    id: `forced_trade_${fromTeamId}_${toTeamId}_${Date.now()}`,
    fromTeamId,
    toTeamId,
    fromTeamPlayers: [fromPlayer.id],
    toTeamPlayers: [toPlayer.id],
    evaluation: {
      fromTeamValue: fromPlayer.value?.total ?? 0,
      toTeamValue: toPlayer.value?.total ?? 0,
      delta:
        (fromPlayer.value?.total ?? 0) -
        (toPlayer.value?.total ?? 0),
      verdict: "ACCEPT", // 👈 force accept
    },
    createdAt: Date.now(),
  };
}
