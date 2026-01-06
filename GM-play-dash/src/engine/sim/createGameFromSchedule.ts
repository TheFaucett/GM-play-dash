// src/engine/sim/createGameFromSchedule.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Game } from "../types/game";

/**
 * Expected format:
 *   game_<homeTeamId>_<awayTeamId>_<index>
 * Example:
 *   game_team_3_team_9_1
 */
const GAME_ID_REGEX = /^game_(team_\d+)_(team_\d+)_(\d+)$/;

export function createGameFromSchedule(
  state: LeagueState,
  seasonId: EntityId,
  gameId: EntityId
): LeagueState {
  // Idempotent
  if (state.games[gameId]) return state;

  const match = gameId.match(GAME_ID_REGEX);
  if (!match) {
    console.error("❌ Invalid gameId format:", gameId);
    return state;
  }

  const [, homeTeamId, awayTeamId] = match;

  // Validate teams exist
  if (!state.teams[homeTeamId] || !state.teams[awayTeamId]) {
    console.error("❌ Game references unknown team(s)", {
      gameId,
      homeTeamId,
      awayTeamId,
      knownTeams: Object.keys(state.teams),
    });
    return state;
  }

  const now = Date.now();

  const game: Game = {
    id: gameId,
    createdAt: now,
    updatedAt: now,

    seasonId,

    homeTeamId: homeTeamId as EntityId,
    awayTeamId: awayTeamId as EntityId,

    status: "scheduled",

    score: {
      home: 0,
      away: 0,
    },

    halfInningIds: [],
  };

  return {
    ...state,
    games: {
      ...state.games,
      [gameId]: game,
    },
  };
}
