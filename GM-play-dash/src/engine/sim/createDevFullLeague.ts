import type { LeagueState } from "../types/league";
import { ageContracts } from "../sim/ageContracts";

export function handleAdvanceToOffseason(
  state: LeagueState
): LeagueState {
  if (state.meta.phase !== "REGULAR_SEASON") {
    console.warn("⛔ Cannot advance to offseason from phase:", state.meta.phase);
    return state;
  }

  const seasonId = state.pointers.seasonId;
  if (!seasonId) return state;

  const now = Date.now();

  console.log("🏁 Season complete. Advancing to OFFSEASON.");

  /* --------------------------------------------
     1️⃣ CONTRACT AGING (ONCE PER YEAR)
  -------------------------------------------- */

  let next = ageContracts(state);

  /* --------------------------------------------
     2️⃣ PHASE TRANSITION
  -------------------------------------------- */

  next = {
    ...next,
    meta: {
      ...next.meta,
      phase: "OFFSEASON",
    },

    seasons: {
      ...next.seasons,
      [seasonId]: {
        ...next.seasons[seasonId],
        status: "complete",
        offseasonDay: 0,
        updatedAt: now,
      },
    },

    log: [
      ...next.log,
      {
        id: `log_advance_to_offseason_${seasonId}`,
        timestamp: now,
        type: "ADVANCE_TO_OFFSEASON",
        refs: [seasonId],
        description: "Season ended. Entered offseason.",
      },
    ],
  };

  return next;
}
