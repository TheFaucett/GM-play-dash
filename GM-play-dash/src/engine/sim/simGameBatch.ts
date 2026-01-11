// src/engine/sim/simGameBatch.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";

import { createGameFromSchedule } from "./createGameFromSchedule";
import { handleStartGame } from "../reducer/handlers/startGame";
import { handleSimGame } from "../reducer/handlers/simGame";
import { finalizeGame } from "./finalizeGame";
import { applyBoxScoreToSeasonStats } from "./applyBoxScoreToSeasonStats";

/**
 * Batch-simulates EXACTLY ONE game.
 *
 * Responsibilities:
 * - Ensure game exists
 * - Start game if scheduled
 * - Sim full game
 * - Finalize + box score
 * - Apply season stats
 * - Advance season pointer by 1
 */
export function simGameBatch(
  state: LeagueState,
  seasonId: EntityId,
  gameId: EntityId
): LeagueState {
  let next = state;

  const season = next.seasons[seasonId];
  if (!season) {
    console.error("❌ simGameBatch: season not found", seasonId);
    return next;
  }

  /* --------------------------------------------
     1️⃣ Ensure game exists
  -------------------------------------------- */
  if (!next.games[gameId]) {
    next = createGameFromSchedule(next, seasonId, gameId);
  }

  let game = next.games[gameId];
  if (!game) {
    console.error("❌ simGameBatch: game missing after creation", gameId);
    return next;
  }

  /* --------------------------------------------
     2️⃣ Start game if scheduled
  -------------------------------------------- */
  if (game.status === "scheduled") {
    next = handleStartGame(next, {
      type: "START_GAME",
      payload: {
        seasonId,
        gameId,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
      },
    });

    game = next.games[gameId];
    if (!game) {
      console.error("❌ simGameBatch: game missing after start", gameId);
      return next;
    }
  }

  /* --------------------------------------------
     3️⃣ Sim entire game (pitch-by-pitch)
  -------------------------------------------- */
  next = handleSimGame(next, gameId);

  /* --------------------------------------------
     4️⃣ Finalize game (winner, box score)
  -------------------------------------------- */
  next = finalizeGame(next, gameId);

  game = next.games[gameId];
  if (!game || game.status !== "final") {
    console.error("❌ simGameBatch: game did not finalize", gameId);
    return next;
  }

  /* --------------------------------------------
     5️⃣ Apply box score → season stats
  -------------------------------------------- */
  next = applyBoxScoreToSeasonStats(next, seasonId, gameId);

  /* --------------------------------------------
     6️⃣ Advance season progress (ONE place only)
  -------------------------------------------- */
  const updatedSeason = next.seasons[seasonId];

  next = {
    ...next,
    seasons: {
      ...next.seasons,
      [seasonId]: {
        ...updatedSeason,
        currentGameIndex: updatedSeason.currentGameIndex + 1,
        day: updatedSeason.day + 1,
      },
    },
  };

  /* --------------------------------------------
     7️⃣ DEV sanity logging
  -------------------------------------------- */
  console.log("✅ simGameBatch complete", {
    gameId,
    score: game.score,
    nextGameIndex:
      next.seasons[seasonId].currentGameIndex,
  });

  return next;
}
