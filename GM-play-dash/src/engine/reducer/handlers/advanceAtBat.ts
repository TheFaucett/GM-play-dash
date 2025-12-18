import type { LeagueState } from "../../types/league";
import { advanceRunners } from "../../sim/advanceRunners";

export function handleAdvanceAtBat(
  state: LeagueState
): LeagueState {
  const { atBatId, halfInningId, gameId } = state.pointers;
  if (!atBatId || !halfInningId || !gameId) return state;

  const atBat = state.atBats[atBatId];
  const halfInning = state.halfInnings[halfInningId];
  const game = state.games[gameId];

  // Only advance if the at-bat has resolved
  if (!atBat?.result) return state;

  const now = Date.now();

  let outs = halfInning.outs;
  let runnerState = halfInning.runnerState;
  let score = { ...game.score };

  // ----- OUTS -----
  if (atBat.result === "strikeout" || atBat.result === "out") {
    outs += 1;
  }

  // ----- WALK -----
  if (atBat.result === "walk") {
    const advanced = advanceRunners(runnerState, 1);
    runnerState = advanced.runnerState;

    if (halfInning.battingTeamId === game.homeTeamId) {
      score.home += advanced.runsScored;
    } else {
      score.away += advanced.runsScored;
    }
  }

  // ----- NEXT AT-BAT -----
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

    games: {
      ...state.games,
      [gameId]: {
        ...game,
        updatedAt: now,
        score,
      },
    },

    halfInnings: {
      ...state.halfInnings,
      [halfInningId]: {
        ...halfInning,
        updatedAt: now,
        outs,
        runnerState,
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
        description: `At-bat resolved: ${atBat.result}`,
        refs: [nextAtBatId],
      },
    ],
  };
}
