// src/engine/reducer/handlers/handleSimGame.ts

import type { LeagueState } from "../../types/league";
import { handleSimInning } from "./simInning";

/**
 * Simulates an entire game from the current state.
 *
 * Assumes:
 * - pointers.gameId is set
 * - game progresses via half innings
 * - handleSimInning advances inning state safely
 */
export function handleSimGame(
  state: LeagueState
): LeagueState {
  let next = state;

  const gameId = state.pointers.gameId;
  if (!gameId) return state;

  // Hard safety cap to prevent infinite loops
  // (162 innings is absurdly high for baseball)
  let safetyCounter = 0;
  const MAX_INNINGS = 200;

  while (true) {
    const game = next.games[gameId];
    if (!game) break;

    // Stop if game is final
    if (game.status === "final") {
      break;
    }

    // Safety valve
    if (safetyCounter++ > MAX_INNINGS) {
      console.warn("SimGame aborted: inning safety cap reached");
      break;
    }

    next = handleSimInning(next);
  }

  return next;
}
