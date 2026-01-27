// src/engine/reducer/handlers/handleSimDay.ts

import type { LeagueState } from "../../types/league";
import type { Season } from "../../types/season";
import { handleSimGame } from "./simGame";

/* ==============================================
   PHASE GUARD
============================================== */

function canAdvanceDay(state: LeagueState): boolean {
  if (
    state.meta.phase === "REGULAR_SEASON" ||
    state.meta.phase === "POSTSEASON"
  ) {
    return true;
  }

  console.warn(
    "⛔ handleSimDay blocked: invalid phase",
    state.meta.phase
  );
  return false;
}

/* ==============================================
   MAIN ENTRY
============================================== */

export function handleSimDay(state: LeagueState): LeagueState {
  // 🚨 Phase enforcement
  if (!canAdvanceDay(state)) {
    return state;
  }

  let next = state;

  const seasonId = state.pointers.seasonId;
  if (!seasonId) {
    console.warn("⚠️ handleSimDay: no seasonId in pointers");
    return state;
  }

  let season = next.seasons[seasonId];
  if (!season) {
    console.warn("⚠️ handleSimDay: season not found", seasonId);
    return state;
  }

  // Season must already be scheduled
  if (season.status === "scheduled") {
    console.warn(
      "⚠️ handleSimDay called before season initialized"
    );
    return state;
  }

  // Nothing to do if season already complete
  if (season.status === "complete") {
    return state;
  }

  console.log("📆 handleSimDay START", {
    day: season.day,
    index: season.currentGameIndex,
    totalGames: season.gameIds.length,
  });

  /* --------------------------------------------
     DETERMINE TODAY'S GAMES
  -------------------------------------------- */

  const gamesPerDay = Math.floor(season.teamIds.length / 2);

  const startIndex = season.currentGameIndex;
  const endIndex = Math.min(
    startIndex + gamesPerDay,
    season.gameIds.length
  );

  const todaysGames = season.gameIds.slice(
    startIndex,
    endIndex
  );

  /* --------------------------------------------
     SIM TODAY'S GAMES
  -------------------------------------------- */

  for (const gameId of todaysGames) {
    next = handleSimGame(next, gameId);
  }

  /* --------------------------------------------
     ADVANCE SEASON CLOCK
  -------------------------------------------- */

  const newGameIndex =
    season.currentGameIndex + todaysGames.length;

  let newStatus: Season["status"] = season.status;

  if (newGameIndex >= season.gameIds.length) {
    newStatus = "complete";
    console.log("🏁 Season complete", season.year);
  }

  season = {
    ...season,
    day: season.day + 1,
    currentGameIndex: newGameIndex,
    status: newStatus,
  };

  next = {
    ...next,
    seasons: {
      ...next.seasons,
      [seasonId]: season,
    },
  };

  console.log("📆 handleSimDay END", {
    day: season.day,
    gamesSimmed: todaysGames.length,
    status: season.status,
  });

  return next;
}
