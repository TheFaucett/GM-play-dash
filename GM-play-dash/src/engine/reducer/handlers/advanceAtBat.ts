import type { LeagueState } from "../../types/league";
import type { Team } from "../../types/team";
import type { HalfInning } from "../../types/halfInning";
import type { AtBat, AtBatResult } from "../../types/atBat";
import { advanceRunners } from "../../sim/advanceRunners";
import { createDefaultDefense } from "../../sim/defaultDefense";
import { advanceOnWalk } from "../../sim/advanceWalk";
import { debug } from "../../debug/log";

/* ----------------------------------------------
   HELPERS (SELF-CONTAINED / GUARDED)
---------------------------------------------- */

function getTeam(state: LeagueState, teamId: string): Team | undefined {
  return state.teams[teamId];
}

function safeLineup(team?: Team): string[] {
  return Array.isArray(team?.lineup) ? team!.lineup.filter(Boolean) : [];
}

function pickPitcherId(team?: Team): string | undefined {
  if (!team) return undefined;
  return team.activePitcherId ?? team.rotation?.[0];
}

function scoreRuns(
  score: { home: number; away: number },
  battingTeamId: string,
  homeTeamId: string,
  runs: number
) {
  if (runs <= 0) return score;
  return battingTeamId === homeTeamId
    ? { ...score, home: score.home + runs }
    : { ...score, away: score.away + runs };
}

function nextId(prefix: string, existing: Record<string, unknown>): string {
  let n = Object.keys(existing).length;
  while (existing[`${prefix}_${n}`]) n++;
  return `${prefix}_${n}`;
}

function clampLineupIndex(idx: number, len: number): number {
  if (len <= 0) return 0;
  return ((idx % len) + len) % len;
}

function isResolved(atBat: AtBat): boolean {
  return Boolean(atBat.result && (atBat as any).resolvedAt);
}

/* ==============================================
   ADVANCE AT BAT (ENGINE-SAFE)
============================================== */
export function handleAdvanceAtBat(state: LeagueState): LeagueState {
  const { atBatId, halfInningId, gameId } = state.pointers;
  if (!atBatId || !halfInningId || !gameId) return state;

  const atBat = state.atBats[atBatId];
  const half = state.halfInnings[halfInningId];
  const game = state.games[gameId];
  if (!atBat || !half || !game) return state;

  const now = Date.now();

  let outs = half.outs;
  let runnerState = half.runnerState;
  let score = { ...game.score };

  const battingTeam = getTeam(state, half.battingTeamId);
  const fieldingTeam = getTeam(state, half.fieldingTeamId);
  const lineup = safeLineup(battingTeam);
  const pitcherId = pickPitcherId(fieldingTeam);

  const canCreateNext = lineup.length > 0 && Boolean(pitcherId);

  /* ----------------------------------------------
     STRICTMODE / DUPLICATE DISPATCH GUARD
  ---------------------------------------------- */
  if (half.currentAtBatId !== atBatId) {
    debug("ADVANCE_AT_BAT duplicate ignored", {
      atBatId,
      current: half.currentAtBatId,
    });
    return state;
  }

  /* ----------------------------------------------
     IDEMPOTENT PATH (already consumed)
  ---------------------------------------------- */
  if (isResolved(atBat)) {
    if (!canCreateNext) return state;

    const nextIndex = clampLineupIndex(
      half.lineupIndex + 1,
      lineup.length
    );
    const nextAtBatId = nextId("ab", state.atBats);

    const nextAtBat: AtBat = {
      id: nextAtBatId,
      createdAt: now,
      updatedAt: now,
      halfInningId,
      batterId: lineup[nextIndex],
      pitcherId: pitcherId!,
      count: { balls: 0, strikes: 0 },
      pitchIds: [],
    };

    const nextHalf: HalfInning = {
      ...half,
      updatedAt: now,
      lineupIndex: nextIndex,
      atBatIds: [...half.atBatIds, nextAtBatId],
      currentAtBatId: nextAtBatId,
    };

    return {
      ...state,
      halfInnings: { ...state.halfInnings, [halfInningId]: nextHalf },
      atBats: { ...state.atBats, [nextAtBatId]: nextAtBat },
      pointers: { ...state.pointers, atBatId: nextAtBatId },
    };
  }

  /* ----------------------------------------------
     HARD RESULT NARROWING (TYPE-SAFE)
  ---------------------------------------------- */
  if (!atBat.result) {
    debug("ADVANCE_AT_BAT blocked (no result)", { atBatId });
    return state;
  }

  const result: AtBatResult = atBat.result;

  debug("ADVANCE_AT_BAT apply", { atBatId, result });

  /* ----------------------------------------------
     APPLY RESULT (ONCE)
  ---------------------------------------------- */
  if (atBat.play) {
    outs += atBat.play.outsAdded;

    if (atBat.play.runnerStateAfter) {
      runnerState = atBat.play.runnerStateAfter;
    } else if (result === "walk") {
      const walked = advanceOnWalk(runnerState);
      runnerState = walked.runnerState;
      score = scoreRuns(
        score,
        half.battingTeamId,
        game.homeTeamId,
        walked.runsScored
      );
    } else {
      runnerState = advanceRunners(runnerState, result).runnerState;
    }

    score = scoreRuns(
      score,
      half.battingTeamId,
      game.homeTeamId,
      atBat.play.runsScored
    );
  } else {
    if (result === "walk") {
      const walked = advanceOnWalk(runnerState);
      runnerState = walked.runnerState;
      score = scoreRuns(
        score,
        half.battingTeamId,
        game.homeTeamId,
        walked.runsScored
      );
    } else {
      const adv = advanceRunners(runnerState, result);
      runnerState = adv.runnerState;
      outs += adv.outsAdded;
      score = scoreRuns(
        score,
        half.battingTeamId,
        game.homeTeamId,
        adv.runsScored
      );
    }
  }

  const consumedAtBat: AtBat = {
    ...atBat,
    updatedAt: now,
    resolvedAt: now as any,
  };

  /* ----------------------------------------------
     INNING COMPLETE?
  ---------------------------------------------- */
  if (outs >= 3) {
    const nextSide: "top" | "bottom" =
      half.side === "top" ? "bottom" : "top";

    const nextHalfId = nextId("half", state.halfInnings);
    const nextAtBatId = nextId("ab", state.atBats);

    const nextBattingTeamId =
      nextSide === "top" ? game.awayTeamId : game.homeTeamId;

    const nextFieldingTeamId =
      nextSide === "top" ? game.homeTeamId : game.awayTeamId;

    const nextLineup = safeLineup(getTeam(state, nextBattingTeamId));
    const nextPitcherId = pickPitcherId(
      getTeam(state, nextFieldingTeamId)
    );

    if (!nextLineup.length || !nextPitcherId) return state;

    const nextHalf: HalfInning = {
      id: nextHalfId,
      createdAt: now,
      updatedAt: now,
      gameId,
      inningNumber:
        half.side === "top"
          ? half.inningNumber
          : half.inningNumber + 1,
      side: nextSide,
      battingTeamId: nextBattingTeamId,
      fieldingTeamId: nextFieldingTeamId,
      defense: createDefaultDefense(nextFieldingTeamId),
      outs: 0,
      runnerState: { type: "empty" } as const,
      lineupIndex: 0,
      atBatIds: [nextAtBatId],
      currentAtBatId: nextAtBatId,
    };

    const nextAtBat: AtBat = {
      id: nextAtBatId,
      createdAt: now,
      updatedAt: now,
      halfInningId: nextHalfId,
      batterId: nextLineup[0],
      pitcherId: nextPitcherId,
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
          halfInningIds: [...game.halfInningIds, nextHalfId],
          currentHalfInningId: nextHalfId,
        },
      },
      halfInnings: {
        ...state.halfInnings,
        [halfInningId]: { ...half, updatedAt: now, outs, runnerState },
        [nextHalfId]: nextHalf,
      },
      atBats: {
        ...state.atBats,
        [atBatId]: consumedAtBat,
        [nextAtBatId]: nextAtBat,
      },
      pointers: {
        ...state.pointers,
        halfInningId: nextHalfId,
        atBatId: nextAtBatId,
      },
    };
  }

  /* ----------------------------------------------
     NORMAL NEXT AT-BAT
  ---------------------------------------------- */
  if (!canCreateNext) return state;

  const nextIndex = clampLineupIndex(
    half.lineupIndex + 1,
    lineup.length
  );
  const nextAtBatId = nextId("ab", state.atBats);

  const nextAtBat: AtBat = {
    id: nextAtBatId,
    createdAt: now,
    updatedAt: now,
    halfInningId,
    batterId: lineup[nextIndex],
    pitcherId: pitcherId!,
    count: { balls: 0, strikes: 0 },
    pitchIds: [],
  };

  const updatedHalf: HalfInning = {
    ...half,
    updatedAt: now,
    outs,
    runnerState,
    lineupIndex: nextIndex,
    atBatIds: [...half.atBatIds, nextAtBatId],
    currentAtBatId: nextAtBatId,
  };

  return {
    ...state,
    games: {
      ...state.games,
      [gameId]: { ...game, updatedAt: now, score },
    },
    halfInnings: { ...state.halfInnings, [halfInningId]: updatedHalf },
    atBats: {
      ...state.atBats,
      [atBatId]: consumedAtBat,
      [nextAtBatId]: nextAtBat,
    },
    pointers: { ...state.pointers, atBatId: nextAtBatId },
  };
}
