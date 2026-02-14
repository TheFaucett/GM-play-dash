// src/engine/sim/evaluateTradeForTeam.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { TradeProposal } from "../types/trade";
import type { Player } from "../types/player";

import { evaluateTradeValue } from "./evaluateTradeValue";
import { getTeamPlayers } from "./getTeamPlayers";

export function evaluateTradeForTeam(
  state: LeagueState,
  fromTeamId: EntityId,
  toTeamId: EntityId
): TradeProposal | null {
  const fromPlayers = getTeamPlayers(state, fromTeamId);
  const toPlayers = getTeamPlayers(state, toTeamId);

  if (fromPlayers.length === 0 || toPlayers.length === 0) {
    console.warn("evaluateTradeForTeam: one team has no players", {
      fromTeamId,
      toTeamId,
    });
    return null;
  }

  const offerFrom = pickTradePlayers(fromPlayers);
  const offerTo = pickTradePlayers(toPlayers);

  if (!offerFrom || !offerTo) return null;

  const evaluation = evaluateTradeValue({
    fromTeamPlayers: [offerFrom],
    toTeamPlayers: [offerTo],
  });

  if (evaluation.verdict === "REJECT") return null;

  return {
    id: `trade_${fromTeamId}_${toTeamId}_${Date.now()}`,
    fromTeamId,
    toTeamId,
    fromTeamPlayers: [offerFrom.id],
    toTeamPlayers: [offerTo.id],
    evaluation,
    createdAt: Date.now(),
  };
}

/* ---------------------------------------------
   TEMP PICK LOGIC
--------------------------------------------- */

function pickTradePlayers(players: Player[]): Player | null {
  // dev logic: prefer bats
  const bats = players.filter(p => p.role === "BAT");
  return bats[0] ?? players[0] ?? null;
}
