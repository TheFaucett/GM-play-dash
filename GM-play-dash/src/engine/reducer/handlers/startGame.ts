import type { LeagueState } from "../../types/league";
import type { StartGameAction } from "../../actions/types";
import { createDefaultDefense } from "../../sim/defaultDefense";

export function handleStartGame(
  state: LeagueState,
  action: StartGameAction
): LeagueState {
  const now = Date.now();

  const gameId = "game_1";
  const halfInningId = "half_1";
  const atBatId = "ab_1";

  const awayTeam = state.teams[action.payload.awayTeamId];
  const homeTeam = state.teams[action.payload.homeTeamId];

  if (!awayTeam || !homeTeam) return state;

  // -------------------------------------------------
  // SELECT FIRST BATTER & PITCHER
  // -------------------------------------------------
  const lineupIndex = 0;

  const batterId =
    awayTeam.lineup[lineupIndex];

  const pitcherId =
    homeTeam.rotation[0]; // starter

  // -------------------------------------------------
  // Game
  // -------------------------------------------------
  const game = {
    id: gameId,
    createdAt: now,
    updatedAt: now,
    seasonId: action.payload.seasonId,
    homeTeamId: action.payload.homeTeamId,
    awayTeamId: action.payload.awayTeamId,
    status: "in_progress" as const,
    score: { home: 0, away: 0 },
    halfInningIds: [halfInningId],
    currentHalfInningId: halfInningId,
  };

  // -------------------------------------------------
  // Half Inning (TOP 1ST)
  // -------------------------------------------------
  const halfInning = {
    id: halfInningId,
    createdAt: now,
    updatedAt: now,
    gameId,
    inningNumber: 1,
    side: "top" as const,
    battingTeamId: awayTeam.id,
    fieldingTeamId: homeTeam.id,
    outs: 0,
    runnerState: { type: "empty" } as const,
    defense: createDefaultDefense(homeTeam.id),
    atBatIds: [atBatId],
    currentAtBatId: atBatId,
    lineupIndex, // ✅ IMPORTANT
  };

  // -------------------------------------------------
  // First At-Bat
  // -------------------------------------------------
  const atBat = {
    id: atBatId,
    createdAt: now,
    updatedAt: now,
    halfInningId,
    batterId,
    pitcherId,
    count: { balls: 0, strikes: 0 },
    pitchIds: [],
  };

  return {
    ...state,

    games: {
      ...state.games,
      [gameId]: game,
    },

    halfInnings: {
      ...state.halfInnings,
      [halfInningId]: halfInning,
    },

    atBats: {
      ...state.atBats,
      [atBatId]: atBat,
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
