// src/engine/reducer/handlers/handleSimInning.ts

import type { LeagueState } from "../../types/league";
import { handleSimHalfInning } from "./simHalfInning";

/**
 * Simulates exactly one full inning:
 * - current half inning
 * - then the opposing half inning
 *
 * Relies entirely on handleSimHalfInning for stopping conditions.
 */
export function handleSimInning(
  state: LeagueState
): LeagueState {
  let next = state;

  const startingHalfInningId = state.pointers.halfInningId;
  if (!startingHalfInningId) return state;

  /* ------------------------------
     1) Sim current half inning
  ------------------------------ */
  next = handleSimHalfInning(next);

  // After sim, we should now be in the *next* half inning
  const midHalfInningId = next.pointers.halfInningId;
  if (!midHalfInningId || midHalfInningId === startingHalfInningId) {
    // Could not advance → game likely ended
    return next;
  }

  /* ------------------------------
     2) Sim opposing half inning
  ------------------------------ */
  next = handleSimHalfInning(next);

  return next;
}
