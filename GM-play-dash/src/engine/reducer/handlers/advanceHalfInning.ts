import type { LeagueState } from "../../types/league";
import { createDefaultDefense } from "../../sim/defaultDefense";

export function handleAdvanceHalfInning(
  state: LeagueState
): LeagueState {
  const { gameId, halfInningId } = state.pointers;
  if (!gameId || !halfInningId) return state;

  const game = state.games[gameId];
  const halfInning = state.halfInnings[halfInningId];
  if (!game || !halfInning) return state;

  // Only advance if inning is complete
  if (halfInning.outs < 3) return state;

  const now = Date.now();

  const isTop = halfInning.side === "top";
  const nextSide: "top" | "bottom" = isTop ? "bottom" : "top";
  const nextInningNumber = isTop
    ? halfInning.inningNumber
    : halfInning.inningNumber + 1;

  const battingTeamId = nextSide === "top"
    ? game.awayTeamId
    : game.homeTeamId;

  const fieldingTeamId = nextSide === "top"
    ? game.homeTeamId
    : game.awayTeamId;

  const nextHalfInningId =
    `half_${Object.keys(state.halfInnings).length}`;
  const nextAtBatId =
    `ab_${Object.keys(state.atBats).length}`;

  const nextHalfInning = {
    id: nextHalfInningId,
    createdAt: now,
    updatedAt: now,
    gameId,
    inningNumber: nextInningNumber,
    side: nextSide,
    battingTeamId,
    fieldingTeamId,
    outs: 0,
    runnerState: { type: "empty" } as const,
    defense: createDefaultDefense(fieldingTeamId),
    lineupIndex: 0, // 🔑 REQUIRED
    atBatIds: [nextAtBatId],
    currentAtBatId: nextAtBatId,
  };

  const nextAtBat = {
    id: nextAtBatId,
    createdAt: now,
    updatedAt: now,
    halfInningId: nextHalfInningId,
    batterId: "batter_1",   // temporary
    pitcherId: "pitcher_1", // temporary
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
        halfInningIds: [...game.halfInningIds, nextHalfInningId],
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
