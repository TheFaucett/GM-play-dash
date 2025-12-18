import type { LeagueState } from "../../types/league";
import type { StartGameAction } from "../../actions/types";
import type { Player } from "../../types/player";

export function handleStartGame(
  state: LeagueState,
  action: StartGameAction
): LeagueState {
  const now = Date.now();

  const gameId = "game_1";
  const halfInningId = "half_1";
  const atBatId = "ab_1";

  const batterId = "batter_1";
  const pitcherId = "pitcher_1";

  // -------------------------------------------------
  // Stub players (engine bootstrap)
  // -------------------------------------------------
  const batter: Player = {
    id: batterId,
    createdAt: now,
    updatedAt: now,
    name: "Test Batter",
    age: 25,
    handedness: "R",
    teamId: action.payload.awayTeamId,
    level: "MLB",
    role: "BAT",
    ratings: {
      contact: 55,
      power: 50,
      discipline: 60,
      vision: 55,
    },
    fatigue: 0,
    health: 100,
    history: {
      injuries: [],
      transactions: [],
    },
  };

  const pitcher: Player = {
    id: pitcherId,
    createdAt: now,
    updatedAt: now,
    name: "Test Pitcher",
    age: 27,
    handedness: "R",
    teamId: action.payload.homeTeamId,
    level: "MLB",
    role: "SP",
    ratings: {
      stuff: 60,
      command: 55,
      movement: 55,
      stamina: 60,
    },
    fatigue: 0,
    health: 100,
    history: {
      injuries: [],
      transactions: [],
    },
  };

  return {
    ...state,

    // -------------------------------------------------
    // Players (NEW)
    // -------------------------------------------------
    players: {
      ...state.players,
      [batterId]: batter,
      [pitcherId]: pitcher,
    },

    // -------------------------------------------------
    // Game
    // -------------------------------------------------
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

    // -------------------------------------------------
    // Half Inning
    // -------------------------------------------------
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

    // -------------------------------------------------
    // At-Bat
    // -------------------------------------------------
    atBats: {
      ...state.atBats,
      [atBatId]: {
        id: atBatId,
        createdAt: now,
        updatedAt: now,
        halfInningId,
        batterId,
        pitcherId,
        count: { balls: 0, strikes: 0 },
        pitchIds: [],
      },
    },

    // -------------------------------------------------
    // Pointers
    // -------------------------------------------------
    pointers: {
      gameId,
      halfInningId,
      atBatId,
    },

    // -------------------------------------------------
    // Log
    // -------------------------------------------------
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
