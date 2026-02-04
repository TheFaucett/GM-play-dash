import type { LeagueState } from "../types/league";
import type { Player } from "../types/player";

import { derivePlayerValue } from "./derivePlayerValue";

/**
 * Recomputes Player.value for every player in the league.
 *
 * HARD GUARANTEES:
 * - Pure function
 * - No side effects
 * - Deterministic per call
 * - Safe to call multiple times
 * - Does NOT touch contracts, teams, or intent
 *
 * WHEN TO CALL:
 * - After league creation
 * - After season end
 * - After trades
 * - After FA signings
 */
export function revalueAllPlayers(
  state: LeagueState
): LeagueState {
  const now = Date.now();

  const nextPlayers: LeagueState["players"] = {};

  for (const [id, player] of Object.entries(state.players)) {
    nextPlayers[id] = applyValue(player, now);
  }

  return {
    ...state,
    players: nextPlayers,
  };
}

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

function applyValue(
  player: Player,
  timestamp: number
): Player {
  return {
    ...player,
    value: derivePlayerValue(player),
    updatedAt: timestamp,
  };
}
