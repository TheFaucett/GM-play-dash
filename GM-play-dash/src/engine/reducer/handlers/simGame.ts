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
 *
 * IMPORTANT:
 * - Does NOT clear or require pointers
 * - Does NOT assume UI context
 */
export function handleSimGame(
  state: LeagueState,
  forcedGameId?: EntityId
): LeagueState {
  let next = state;

  const gameId =
    forcedGameId ?? state.pointers.gameId;

  if (!gameId) {
    console.warn(
      "⚠️ handleSimGame: No gameId available for sim"
    );
    return state;
  }

  let game = next.games[gameId];

  if (!game) {
    console.warn(
      "⚠️ handleSimGame: Game not found",
      gameId
    );
    return state;
  }

  console.log("🔥 handleSimGame START", {
    gameId,
    status: game.status,
  });

  /* ---------------------------------------------
     SAFETY GUARDS
  --------------------------------------------- */

  let safetyCounter = 0;
  const MAX_HALF_INNINGS = 400; // absurdly high

  /* ---------------------------------------------
     MAIN GAME LOOP
  --------------------------------------------- */

  while (true) {
    game = next.games[gameId];
    if (!game) break;

    // Stop once game is final
    if (game.status === "final") {
      console.log("🏁 Game finalized:", gameId);
      break;
    }

    // Safety valve
    if (safetyCounter++ > MAX_HALF_INNINGS) {
      console.error(
        "🚨 handleSimGame aborted: safety cap reached",
        gameId
      );
      break;
    }

    const halfInningId = game.currentHalfInningId;

    if (!halfInningId) {
      console.warn(
        "⚠️ handleSimGame: No currentHalfInningId",
        gameId
      );
      break;
    }

    const half = next.halfInnings[halfInningId];
    if (!half) {
      console.warn(
        "⚠️ handleSimGame: Half inning missing",
        halfInningId
      );
      break;
    }

    console.log(
      `🏟️ Sim Half Inning — Inning ${half.inningNumber} ${half.side}`
    );

    // Advance one half inning safely
    next = handleSimInning(next);
  }

  console.log("🏁 handleSimGame COMPLETE", gameId);

  return next;
}
