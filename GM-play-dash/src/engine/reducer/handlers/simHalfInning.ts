import type { LeagueState } from "../../types/league";
import { handleCallPitch } from "./callPitch";
import { handleAdvanceAtBat } from "./advanceAtBat";

/**
 * Auto-sim a full half inning using the real engine.
 * This repeatedly:
 *   1) auto-calls pitches until an at-bat resolves
 *   2) advances the at-bat
 * until the half inning ends or the game ends.
 */
export function handleSimHalfInning(
  state: LeagueState
): LeagueState {
  let next = state;
  const startingHalfInningId = state.pointers.halfInningId;
  while (true) {
    const { gameId, halfInningId, atBatId } = next.pointers;
    if (!gameId || !halfInningId || !atBatId) break;

    const game = next.games[gameId];
    const half = next.halfInnings[halfInningId];
    const atBat = next.atBats[atBatId];

    if (!game || !half || !atBat) break;

    // Game already finished
    if (game.status === "final") break;

    // Half inning complete
    if (half.outs >= 3){
      next = handleAdvanceAtBat(next);
      break;
    }
    // We have moved on to a NEW half inning → stop sim
    if (halfInningId !== startingHalfInningId) {
      console.warn("Half inning completed, stopping sim.");
      break;
    }

    // -----------------------------------------
    // 1) If at-bat has no result, auto-call pitch
    // -----------------------------------------
    if (!atBat.result) {
      next = handleCallPitch(next, {
        type: "CALL_PITCH",
        payload: {
          pitchType: "FF",
          location: "middle",
          intent: "attack",
        },
      });
      continue;
    }

    // -----------------------------------------
    // 2) At-bat resolved → advance engine
    // -----------------------------------------
    next = handleAdvanceAtBat(next);
  }

  return next;
}
