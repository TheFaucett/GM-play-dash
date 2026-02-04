// src/engine/sim/evaluateTradeForTeam.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { TradeProposal } from "../types/trade";
import type { Player, PlayerRole } from "../types/player";

import { evaluateTradeValue } from "./evaluateTradeValue";
import { deriveTeamNeeds } from "./deriveTeamNeeds";

/**
 * Generates a single AI trade proposal between two teams.
 *
 * PHASE B2:
 * - Single-player offers
 * - No salary matching
 * - No multi-asset logic yet
 * - Cheap needs-based gate to prevent nonsense trades
 */
export function evaluateTradeForTeam(
  state: LeagueState,
  fromTeamId: EntityId,
  toTeamId: EntityId
): TradeProposal | null {
  const fromTeam = state.teams[fromTeamId];
  const toTeam = state.teams[toTeamId];

  if (!fromTeam || !toTeam) return null;

  const fromPlayers = pickTradePlayers(state, fromTeamId);
  const toPlayers = pickTradePlayers(state, toTeamId);

  if (fromPlayers.length === 0 || toPlayers.length === 0) {
    return null;
  }

  /* ---------------------------------------------
     🧠 CHEAP NEEDS GATE (ANTI-SPAM)
  --------------------------------------------- */

  const fromNeeds = deriveTeamNeeds(state, fromTeam);
  const toNeeds = deriveTeamNeeds(state, toTeam);

  const outgoing = fromPlayers[0];
  const incoming = toPlayers[0];

  const outgoingRole = normalizeRole(outgoing.role);
  const incomingRole = normalizeRole(incoming.role);

  const helpsFrom =
    fromNeeds[incomingRole] > 0;

  const helpsTo =
    toNeeds[outgoingRole] > 0;

  // 🚫 If this trade helps nobody, kill it early
  if (!helpsFrom && !helpsTo) {
    return null;
  }

  /* ---------------------------------------------
     📊 VALUE EVALUATION
  --------------------------------------------- */

  const evaluation = evaluateTradeValue({
    fromTeamPlayers: fromPlayers,
    toTeamPlayers: toPlayers,
  });

  if (evaluation.verdict === "REJECT") {
    return null;
  }

  /* ---------------------------------------------
     ✅ PROPOSAL
  --------------------------------------------- */

  return {
    id: `trade_${fromTeamId}_${toTeamId}_${Date.now()}`,
    fromTeamId,
    toTeamId,
    fromTeamPlayers: fromPlayers.map(p => p.id),
    toTeamPlayers: toPlayers.map(p => p.id),
    evaluation,
    createdAt: Date.now(),
  };
}

/* ---------------------------------------------
   TEMP HELPERS (Phase B2)
--------------------------------------------- */

function pickTradePlayers(
  state: LeagueState,
  teamId: EntityId
): Player[] {
  const players = Object.values(state.players).filter(
    p => p.teamId === teamId
  );

  if (players.length === 0) return [];

  // TEMP: bias toward BATs if available
  const bats = players.filter(p => p.role === "BAT");
  if (bats.length > 0) {
    return [bats[0]];
  }

  return [players[0]];
}

/**
 * Normalize roles to TeamNeeds keys.
 * (CL counts as RP for needs)
 */
function normalizeRole(role: PlayerRole): "SP" | "RP" | "BAT" {
  switch (role) {
    case "CL":
    case "RP":
      return "RP";
    case "SP":
      return "SP";
    case "BAT":
    default:
      return "BAT";
  }
}
