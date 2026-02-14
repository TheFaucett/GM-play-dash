// src/engine/sim/forceTradeProposal.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { TradeProposal } from "../types/trade";

import { evaluateTradeForTeam } from "./evaluateTradeForTeam";
import { getTeamPlayers } from "./getTeamPlayers";

export function forceTradeProposal(
  state: LeagueState,
  args: {
    fromTeamId: EntityId;
    toTeamId: EntityId;
  }
): LeagueState {
  const { fromTeamId, toTeamId } = args;

  const fromPlayers = getTeamPlayers(state, fromTeamId);
  const toPlayers = getTeamPlayers(state, toTeamId);

  // 🚨 Hard safety gate
  if (fromPlayers.length === 0 || toPlayers.length === 0) {
    console.error("forceTradeProposal: teams have no players", {
      fromTeamId,
      fromCount: fromPlayers.length,
      toTeamId,
      toCount: toPlayers.length,
    });
    return state;
  }

  const proposal = evaluateTradeForTeam(state, fromTeamId, toTeamId);

  if (!proposal) {
    console.warn("forceTradeProposal: trade rejected by evaluator", {
      fromTeamId,
      toTeamId,
    });
    return state;
  }

  // ✅ TradeInbox stores proposals grouped by receiving team
  const existing: TradeProposal[] = state.tradeInbox[toTeamId] ?? [];

  return {
    ...state,
    tradeInbox: {
      ...state.tradeInbox,
      [toTeamId]: [...existing, proposal],
    },
  };
}
