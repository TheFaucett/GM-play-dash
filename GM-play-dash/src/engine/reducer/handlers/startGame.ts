// src/engine/reducer/handlers/handleStartGame.ts

import type { LeagueState } from "../../types/league";
import type { StartGameAction } from "../../actions/types";
import { createDefaultDefense } from "../../sim/defaultDefense";

export function handleStartGame(
  state: LeagueState,
  action: StartGameAction
): LeagueState {
  const now = Date.now();

  const { gameId } = action.payload;
  const game = state.games[gameId];
  if (!game || game.status !== "scheduled") return state;

  const homeTeam = state.teams[game.homeTeamId];
  const awayTeam = state.teams[game.awayTeamId];
  if (!homeTeam || !awayTeam) return state;

  /* ---------------------------------------------
     FIRST BATTER & PITCHER
  --------------------------------------------- */

  const lineupIndex = 0;

  const batterId = awayTeam.lineup[lineupIndex];
  const pitcherId = homeTeam.rotation[0];

  if (!batterId || !pitcherId) return state;

  /* ---------------------------------------------
     IDS
  --------------------------------------------- */

  const halfInningId = `half_${gameId}_1`;
  const atBatId = `ab_${halfInningId}_1`;

  /* ---------------------------------------------
     HALF INNING (TOP 1ST)
  --------------------------------------------- */

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

    lineupIndex,
  };

  /* ---------------------------------------------
     AT-BAT
  --------------------------------------------- */

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

  /* ---------------------------------------------
     WRITE STATE
  --------------------------------------------- */

  return {
    ...state,

    games: {
      ...state.games,
      [gameId]: {
        ...game,
        status: "in_progress",
        updatedAt: now,
        halfInningIds: [halfInningId],
        currentHalfInningId: halfInningId,
      },
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
      ...state.pointers,
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
        description: `Game started (${awayTeam.name} @ ${homeTeam.name})`,
        refs: [gameId],
      },
    ],
  };
}
