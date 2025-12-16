import type { LeagueState } from "../../types/league";
import type { StartGameAction } from "../../actions/types";

export function handleStartGame(
  state: LeagueState,
  action: StartGameAction
): LeagueState {
  const now = Date.now();

  const gameId = "game_1";
  const halfInningId = "half_1";
  const atBatId = "ab_1";

  return {
    ...state,

    games: {
      ...state.games,
      [gameId]: {
        id: gameId,
        createdAt: now,
        updatedAt: now,
        seasonId: action.payload.seasonId,
        homeTeamId: action.payload.homeTeamId,
        awayTeamId: action.payload.awayTeamId,
        status: "in_progress",
        score: { home: 0, away: 0 },
        halfInningIds: [halfInningId],
        currentHalfInningId: halfInningId,
      },
    },

    halfInnings: {
      ...state.halfInnings,
      [halfInningId]: {
        id: halfInningId,
        createdAt: now,
        updatedAt: now,
        gameId,
        inningNumber: 1,
        side: "top",
        battingTeamId: action.payload.awayTeamId,
        fieldingTeamId: action.payload.homeTeamId,
        outs: 0,
        runnerState: { type: "empty" },
        atBatIds: [atBatId],
        currentAtBatId: atBatId,
      },
    },

    atBats: {
      ...state.atBats,
      [atBatId]: {
        id: atBatId,
        createdAt: now,
        updatedAt: now,
        halfInningId,
        batterId: "batter_1",
        pitcherId: "pitcher_1",
        count: { balls: 0, strikes: 0 },
        pitchIds: [],
      },
    },

    pointers: {
      gameId,
      halfInningId,
      atBatId,
    },

    log: [
      ...state.log,
      {
        id: `log_${state.log.length}`,
        timestamp: now,
        type: "START_GAME",
        description: "Game started",
        refs: [gameId],
      },
    ],
  };
}
