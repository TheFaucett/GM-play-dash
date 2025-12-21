import type { LeagueState } from "../../types/league";
import { advanceRunners } from "../../sim/advanceRunners";
import { createDefaultDefense } from "../../sim/defaultDefense";

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

  // -------------------------------------------------
  // STEP 20 — APPLY RESOLVED PLAY (if present)
  // -------------------------------------------------
  if (atBat.play) {
    outs += atBat.play.outsAdded;

    if (atBat.play.runnerStateAfter) {
      runnerState = atBat.play.runnerStateAfter;
    } else {
      // Fall back to generic advancement for hits
      const advanced = advanceRunners(
        runnerState,
        atBat.result
      );
      runnerState = advanced.runnerState;
    }

    if (atBat.play.runsScored > 0) {
      if (halfInning.battingTeamId === game.homeTeamId) {
        score.home += atBat.play.runsScored;
      } else {
        score.away += atBat.play.runsScored;
      }
    }
  } else {
    // -------------------------------------------------
    // FALLBACK — STEP 17 behavior
    // -------------------------------------------------
    const advanced = advanceRunners(
      runnerState,
      atBat.result
    );

    runnerState = advanced.runnerState;
    outs += advanced.outsAdded;

    if (advanced.runsScored > 0) {
      if (halfInning.battingTeamId === game.homeTeamId) {
        score.home += advanced.runsScored;
      } else {
        score.away += advanced.runsScored;
      }
    }
  }

  // -------------------------------------------------
  // STEP 18 — INNING COMPLETE?
  // -------------------------------------------------
  if (outs >= 3) {
    const isTop = halfInning.side === "top";
    const nextSide: "top" | "bottom" =
      isTop ? "bottom" : "top";

    const nextInningNumber =
      isTop
        ? halfInning.inningNumber
        : halfInning.inningNumber + 1;

    const nextHalfInningId =
      `half_${Object.keys(state.halfInnings).length}`;

    const nextAtBatId =
      `ab_${Object.keys(state.atBats).length}`;

    const battingTeamId =
      nextSide === "top"
        ? game.awayTeamId
        : game.homeTeamId;

    const fieldingTeamId =
      nextSide === "top"
        ? game.homeTeamId
        : game.awayTeamId;

    const nextHalfInning = {
      id: nextHalfInningId,
      createdAt: now,
      updatedAt: now,
      gameId,
      inningNumber: nextInningNumber,
      side: nextSide,
      battingTeamId,
      defense: createDefaultDefense(fieldingTeamId),
      fieldingTeamId,
      outs: 0,
      runnerState: { type: "empty" } as const,
      atBatIds: [nextAtBatId],
      currentAtBatId: nextAtBatId,
    };

    const nextAtBat = {
      id: nextAtBatId,
      createdAt: now,
      updatedAt: now,
      halfInningId: nextHalfInningId,
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
          halfInningIds: [
            ...game.halfInningIds,
            nextHalfInningId,
          ],
          currentHalfInningId: nextHalfInningId,
        },
      },

      halfInnings: {
        ...state.halfInnings,
        [nextHalfInningId]: nextHalfInning,
      },

      atBats: {
        ...state.atBats,
        [nextAtBatId]: nextAtBat,
      },

      pointers: {
        ...state.pointers,
        halfInningId: nextHalfInningId,
        atBatId: nextAtBatId,
      },

      log: [
        ...state.log,
        {
          id: `log_${state.log.length}`,
          timestamp: now,
          type: "ADVANCE_HALF_INNING",
          description: `Inning ${nextInningNumber} ${nextSide}`,
          refs: [nextHalfInningId],
        },
      ],
    };
  }

  // -------------------------------------------------
  // NORMAL FLOW — NEXT AT-BAT
  // -------------------------------------------------
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
        defense: halfInning.defense,
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
