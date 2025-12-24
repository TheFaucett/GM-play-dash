import type { LeagueState } from "../../types/league";
import { advanceRunners } from "../../sim/advanceRunners";
import { createDefaultDefense } from "../../sim/defaultDefense";
import { advanceOnWalk } from "../../sim/advanceWalk";

// Minimal team shape this handler needs.
// If you have a real Team type, import it instead.
type TeamLike = {
  id: string;
  lineup: string[]; // batter playerIds
  lineupIndex: number; // 0..8 (next batter)
  starterPitcherId: string; // pitcher playerId (v1)
};

function getTeam(state: LeagueState, teamId: string): TeamLike | undefined {
  return (state as unknown as { teams: Record<string, TeamLike> }).teams?.[teamId];
}

function scoreRuns(
  stateScore: { home: number; away: number },
  battingTeamId: string,
  homeTeamId: string,
  runs: number
) {
  const score = { ...stateScore };
  if (runs <= 0) return score;

  if (battingTeamId === homeTeamId) score.home += runs;
  else score.away += runs;

  return score;
}

export function handleAdvanceAtBat(state: LeagueState): LeagueState {
  const { atBatId, halfInningId, gameId } = state.pointers;
  if (!atBatId || !halfInningId || !gameId) return state;

  const atBat = state.atBats[atBatId];
  const halfInning = state.halfInnings[halfInningId];
  const game = state.games[gameId];

  if (!atBat || !halfInning || !game) return state;

  // Only advance if the at-bat has resolved
  if (!atBat.result) return state;

  const now = Date.now();

  let outs = halfInning.outs;
  let runnerState = halfInning.runnerState;
  let score = { ...game.score };

  /* =================================================
     APPLY AT-BAT RESULT (with walk helper)
     ================================================= */

  if (atBat.play) {
    // play override (DP / sac fly / etc.)
    outs += atBat.play.outsAdded;

    if (atBat.play.runnerStateAfter) {
      runnerState = atBat.play.runnerStateAfter;
    } else if (atBat.result === "walk") {
      const walked = advanceOnWalk(runnerState);
      runnerState = walked.runnerState;
      score = scoreRuns(score, halfInning.battingTeamId, game.homeTeamId, walked.runsScored);
    } else {
      // generic advancement for normal hit/out results
      const advanced = advanceRunners(runnerState, atBat.result);
      runnerState = advanced.runnerState;
      // NOTE: outsAdded handled via play override already
    }

    // play-run scoring (sac fly etc.)
    score = scoreRuns(score, halfInning.battingTeamId, game.homeTeamId, atBat.play.runsScored);
  } else {
    // no play override (pure hit/walk/out)
    if (atBat.result === "walk") {
      const walked = advanceOnWalk(runnerState);
      runnerState = walked.runnerState;
      score = scoreRuns(score, halfInning.battingTeamId, game.homeTeamId, walked.runsScored);
    } else {
      const advanced = advanceRunners(runnerState, atBat.result);
      runnerState = advanced.runnerState;
      outs += advanced.outsAdded;
      score = scoreRuns(score, halfInning.battingTeamId, game.homeTeamId, advanced.runsScored);
    }
  }

  /* =================================================
     LINEUP: advance lineupIndex + choose next batter
     ================================================= */

  const battingTeam = getTeam(state, halfInning.battingTeamId);
  const fieldingTeam = getTeam(state, halfInning.fieldingTeamId);

  // If teams/lineups aren't wired yet, don’t pretend.
  if (!battingTeam || battingTeam.lineup.length === 0 || !fieldingTeam) {
    return {
      ...state,
      games: {
        ...state.games,
        [gameId]: { ...game, updatedAt: now, score },
      },
      halfInnings: {
        ...state.halfInnings,
        [halfInningId]: { ...halfInning, updatedAt: now, outs, runnerState },
      },
      log: [
        ...state.log,
        {
          id: `log_${state.log.length}`,
          timestamp: now,
          type: "ADVANCE_AT_BAT",
          description: `At-bat resolved: ${atBat.result} (lineup not wired)`,
          refs: [atBatId],
        },
      ],
    };
  }

  const currentIndex = halfInning.lineupIndex;
  const nextIndex = (currentIndex + 1) % battingTeam.lineup.length;
  const nextBatterId = battingTeam.lineup[nextIndex];

  // v1: pitcher stays fixed per half inning (starter)
  const pitcherId = fieldingTeam.starterPitcherId;

  /* =================================================
     INNING COMPLETE? (create next half inning)
     ================================================= */

  if (outs >= 3) {
    const isTop = halfInning.side === "top";
    const nextSide: "top" | "bottom" = isTop ? "bottom" : "top";
    const nextInningNumber = isTop ? halfInning.inningNumber : halfInning.inningNumber + 1;

    const nextHalfInningId = `half_${Object.keys(state.halfInnings).length}`;
    const nextAtBatId = `ab_${Object.keys(state.atBats).length}`;

    const nextBattingTeamId = nextSide === "top" ? game.awayTeamId : game.homeTeamId;
    const nextFieldingTeamId = nextSide === "top" ? game.homeTeamId : game.awayTeamId;

    const nextBattingTeam = getTeam(state, nextBattingTeamId);
    const nextFieldingTeam = getTeam(state, nextFieldingTeamId);

    if (!nextBattingTeam || nextBattingTeam.lineup.length === 0 || !nextFieldingTeam) {
      // Can't create a valid next half inning.
      // Still finalize the current one.
      return {
        ...state,
        games: {
          ...state.games,
          [gameId]: { ...game, updatedAt: now, score },
        },
        halfInnings: {
          ...state.halfInnings,
          [halfInningId]: {
            ...halfInning,
            updatedAt: now,
            outs,
            runnerState,
            lineupIndex: nextIndex,
          },
        },
      };
    }

    const firstBatterId = nextBattingTeam.lineup[nextBattingTeam.lineupIndex];
    const nextPitcherId = nextFieldingTeam.starterPitcherId;

    const nextHalfInning = {
      id: nextHalfInningId,
      createdAt: now,
      updatedAt: now,
      gameId,
      inningNumber: nextInningNumber,
      side: nextSide,
      battingTeamId: nextBattingTeamId,
      fieldingTeamId: nextFieldingTeamId,
      defense: createDefaultDefense(nextFieldingTeamId),
      outs: 0,
      runnerState: { type: "empty" } as const,
      lineupIndex: nextBattingTeam.lineupIndex,
      atBatIds: [nextAtBatId],
      currentAtBatId: nextAtBatId,
    };

    const nextAtBat = {
      id: nextAtBatId,
      createdAt: now,
      updatedAt: now,
      halfInningId: nextHalfInningId,
      batterId: firstBatterId,
      pitcherId: nextPitcherId,
      count: { balls: 0, strikes: 0 },
      pitchIds: [],
    };

    // STEP 2 hook:
    // if the new batting team is NOT the user's team, schedule SIM_HALF_INNING.
    const shouldSimNextHalfInning =
      "userTeamId" in state && nextBattingTeamId !== (state as any).userTeamId;

    return {
      ...state,

      games: {
        ...state.games,
        [gameId]: {
          ...game,
          updatedAt: now,
          score,
          halfInningIds: [...game.halfInningIds, nextHalfInningId],
          currentHalfInningId: nextHalfInningId,
        },
      },

      halfInnings: {
        ...state.halfInnings,
        [halfInningId]: {
          ...halfInning,
          updatedAt: now,
          outs,
          runnerState,
          lineupIndex: nextIndex,
        },
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

      ...(shouldSimNextHalfInning
        ? { pendingAction: { type: "SIM_HALF_INNING" as const } }
        : null),

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

  /* =================================================
     NORMAL FLOW — NEXT AT-BAT
     ================================================= */

  const nextAtBatId = `ab_${Object.keys(state.atBats).length}`;

  const nextAtBat = {
    id: nextAtBatId,
    createdAt: now,
    updatedAt: now,
    halfInningId,
    batterId: nextBatterId,
    pitcherId,
    count: { balls: 0, strikes: 0 },
    pitchIds: [],
  };

  return {
    ...state,

    games: {
      ...state.games,
      [gameId]: { ...game, updatedAt: now, score },
    },

    halfInnings: {
      ...state.halfInnings,
      [halfInningId]: {
        ...halfInning,
        updatedAt: now,
        outs,
        runnerState,
        lineupIndex: nextIndex,
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
