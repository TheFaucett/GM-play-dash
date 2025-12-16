import type { LeagueState } from "../../types/league";
import type { halfInning, RunnerState } from "../../types/halfInning";
export function handleAdvanceHalfInning(
  state: LeagueState
): LeagueState {
  const { gameId, halfInningId } = state.pointers;
  if (!gameId || !halfInningId) return state;

  const game = state.games[gameId];
  const half = state.halfInnings[halfInningId];
  if (!game || !half) return state;

  // Only advance if 3 outs
  if (half.outs < 3) return state;

  const now = Date.now();

  const isTop = half.side === "top";
  const nextSide: "top" | "bottom" = isTop ? "bottom" : "top";

  const nextInningNumber = isTop
    ? half.inningNumber
    : half.inningNumber + 1;

  const nextHalfId = `half_${Object.keys(state.halfInnings).length}`;
  const nextAtBatId = `ab_${Object.keys(state.atBats).length}`;

  const battingTeamId = isTop
    ? game.homeTeamId
    : game.awayTeamId;

  const fieldingTeamId = isTop
    ? game.awayTeamId
    : game.homeTeamId;

  const nextHalfInning = {
    id: nextHalfId,
    createdAt: now,
    updatedAt: now,
    gameId,
    inningNumber: nextInningNumber,
    side: nextSide,
    battingTeamId,
    fieldingTeamId,
    outs: 0,
    runnerState: { type: "empty" },
    atBatIds: [nextAtBatId],
    currentAtBatId: nextAtBatId,
  };

  const nextAtBat = {
    id: nextAtBatId,
    createdAt: now,
    updatedAt: now,
    halfInningId: nextHalfId,
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
        halfInningIds: [...game.halfInningIds, nextHalfId],
        currentHalfInningId: nextHalfId,
      },
    },

    halfInnings: {
      ...state.halfInnings,
      [nextHalfId]: nextHalfInning,
    },

    atBats: {
      ...state.atBats,
      [nextAtBatId]: nextAtBat,
    },

    pointers: {
      ...state.pointers,
      halfInningId: nextHalfId,
      atBatId: nextAtBatId,
    },

    log: [
      ...state.log,
      {
        id: `log_${state.log.length}`,
        timestamp: now,
        type: "ADVANCE_HALF_INNING",
        description: `Inning ${nextInningNumber} ${nextSide}`,
        refs: [nextHalfId],
      },
    ],
  };
}
