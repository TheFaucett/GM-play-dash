// src/engine/sim/simGameBatch.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";

import { createGameFromSchedule } from "./createGameFromSchedule";
import { handleStartGame } from "../reducer/handlers/startGame";
import { handleSimGame } from "../reducer/handlers/simGame";
import { finalizeGame } from "./finalizeGame";
import { applyBoxScoreToSeasonStats } from "./applyBoxScoreToSeasonStats";

export function simGameBatch(
  state: LeagueState,
  seasonId: EntityId,
  gameId: EntityId
): LeagueState {
  let next = state;

  /* --------------------------------------------
     1️⃣ Ensure game exists
  -------------------------------------------- */
  if (!next.games[gameId]) {
    next = createGameFromSchedule(next, seasonId, gameId);
  }

  const game = next.games[gameId];
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
  }

  /* --------------------------------------------
     3️⃣ Sim entire game
  -------------------------------------------- */
  next = handleSimGame(next);

  /* --------------------------------------------
     4️⃣ Finalize game (box score, winner, etc)
  -------------------------------------------- */
  next = finalizeGame(next, gameId);

  /* --------------------------------------------
     5️⃣ Apply box score → season stats  ✅
  -------------------------------------------- */
  next = applyBoxScoreToSeasonStats(
    next,
    seasonId,
    gameId
  );

  /* --------------------------------------------
     6️⃣ DEV safety check
  -------------------------------------------- */
  if (!next.games[gameId]) {
    console.error("❌ simGameBatch: game missing after sim", gameId);
  }

  return next;
}
