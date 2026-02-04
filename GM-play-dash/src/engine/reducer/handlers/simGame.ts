import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import { handleSimInning } from "./simInning";

/* ==============================================
   PHASE GUARD (PHASE A)
============================================== */

function canSimGame(state: LeagueState): boolean {
  if (
    state.meta.phase === "REGULAR_SEASON" ||
    state.meta.phase === "POSTSEASON"
  ) {
    return true;
  }

  console.warn(
    "⛔ handleSimGame blocked: invalid phase",
    state.meta.phase
  );
  return false;
}

/* ==============================================
   STATE SAFETY WRAPPER
============================================== */

function preserveState(next: LeagueState): LeagueState {
  return {
    ...next,
    meta: next.meta,
    rng: next.rng,
    pointers: {
      ...next.pointers,
    },
    playerIntent: {
      ...next.playerIntent,
    },
    teamIntent: {
      ...next.teamIntent,
    },
  };
}

/**
 * Simulates an entire game to completion.
 *
 * HARD GUARANTEE:
 * - Never returns a partial LeagueState
 * - Never drops pointers
 */
export function handleSimGame(
  state: LeagueState,
  forcedGameId?: EntityId
): LeagueState {
  // 🚨 PHASE A ENFORCEMENT
  if (!canSimGame(state)) {
    return preserveState(state);
  }

  let next = state;

  const gameId =
    forcedGameId ?? state.pointers.gameId;

  if (!gameId) {
    console.warn(
      "⚠️ handleSimGame: No gameId available for sim"
    );
    return preserveState(next);
  }

  let game = next.games[gameId];

  if (!game) {
    console.warn(
      "⚠️ handleSimGame: Game not found",
      gameId
    );
    return preserveState(next);
  }

  console.log("🔥 handleSimGame START", {
    gameId,
    status: game.status,
  });

  /* ---------------------------------------------
     SAFETY GUARDS
  --------------------------------------------- */

  let safetyCounter = 0;
  const MAX_HALF_INNINGS = 400;

  /* ---------------------------------------------
     MAIN GAME LOOP
  --------------------------------------------- */

  while (true) {
    game = next.games[gameId];
    if (!game) {
      console.warn("⚠️ Game disappeared mid-sim", gameId);
      break;
    }

    if (game.status === "final") {
      console.log("🏁 Game finalized:", gameId);
      break;
    }

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

    // Advance one half inning
    next = handleSimInning(next);
  }

  console.log("🏁 handleSimGame COMPLETE", gameId);

  // 🔒 FINAL STATE GUARANTEE
  return preserveState(next);
}
