// src/engine/reducer/handlers/simGame.ts

import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import { handleSimInning } from "./simInning";

/**
 * Simulates an entire game to completion.
 *
 * Can be used in TWO modes:
 * 1) Interactive mode (uses state.pointers.gameId)
 * 2) Batch / season mode (explicit gameId passed)
 */
export function handleSimGame(
  state: LeagueState,
  forcedGameId?: EntityId
): LeagueState {
  let next = state;

  const gameId = forcedGameId ?? state.pointers.gameId;

  if (!gameId) {
    console.warn("⚠️ handleSimGame: No gameId available for sim");
    return state;
  }

  let game = next.games[gameId];

  if (!game) {
    console.warn("⚠️ handleSimGame: Game not found", gameId);
    return state;
  }

  console.log("🔥 handleSimGame START", {
    gameId,
    status: game.status,
  });

  // ---------------------------------------------
  // SAFETY GUARDS
  // ---------------------------------------------
  let safetyCounter = 0;
  const MAX_INNINGS = 200;

  // ---------------------------------------------
  // MAIN GAME LOOP
  // ---------------------------------------------
  while (true) {
    game = next.games[gameId];
    if (!game) break;

    // Stop if already final
    if (game.status === "final") {
      console.log("🏁 Game already final:", gameId);
      break;
    }

    // Hard safety valve
    if (safetyCounter++ > MAX_INNINGS) {
      console.error(
        "🚨 handleSimGame aborted: inning safety cap reached",
        gameId
      );
      break;
    }

    const currentHalfId = game.currentHalfInningId;
    if (!currentHalfId) {
      console.warn("⚠️ No currentHalfInningId, stopping game sim");
      break;
    }

    const half = next.halfInnings[currentHalfId];
    if (!half) {
      console.warn("⚠️ Half inning not found", currentHalfId);
      break;
    }

    console.log(
      `🏟️ Sim Inning ${half.inningNumber} ${half.side.toUpperCase()}`
    );

    next = handleSimInning(next);
  }

  console.log("🏁 handleSimGame COMPLETE", gameId);

  return next;
}
