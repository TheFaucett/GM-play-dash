import type { LeagueState } from "../../types/league";

export function handleAdvanceAtBat(
  state: LeagueState
): LeagueState {
  const { atBatId, halfInningId } = state.pointers;
  if (!atBatId || !halfInningId) return state;

  const atBat = state.atBats[atBatId];
  const halfInning = state.halfInnings[halfInningId];

  // Only advance if the at-bat has resolved
  if (!atBat?.result) return state;

  const now = Date.now();

  let outs = halfInning.outs;

  // Strikeouts count as outs (for now)
  if (atBat.result === "strikeout" || atBat.result === "out") {
    outs += 1;
  }

  const nextAtBatId = `ab_${Object.keys(state.atBats).length}`;

  const nextAtBat = {
    id: nextAtBatId,
    createdAt: now,
    updatedAt: now,
    halfInningId,
    batterId: "batter_1",   // stub
    pitcherId: "pitcher_1", // stub
    count: { balls: 0, strikes: 0 },
    pitchIds: [],
  };

  return {
    ...state,

    halfInnings: {
      ...state.halfInnings,
      [halfInningId]: {
        ...halfInning,
        updatedAt: now,
        outs,
        atBatIds: [...halfInning.atBatIds, nextAtBatId],
        currentAtBatId: nextAtBatId,
      },
    },

    atBats: {
      ...state.atBats,
      [nextAtBatId]: nextAtBat,
    },

    pointers: {
      ...state.pointers,
      atBatId: nextAtBatId,
    },

    log: [
      ...state.log,
      {
        id: `log_${state.log.length}`,
        timestamp: now,
        type: "ADVANCE_AT_BAT",
        description: `New at-bat started (${outs} outs)`,
        refs: [nextAtBatId],
      },
    ],
  };
}
