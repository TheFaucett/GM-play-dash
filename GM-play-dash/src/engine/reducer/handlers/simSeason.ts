import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { Season } from "../../types/season";

import { simGameBatch } from "../../sim/simGameBatch";

/* ==============================================
   CONSTANTS
============================================== */

const GAMES_PER_OPPONENT = 6;

/* ==============================================
   PHASE GUARD (PHASE A)
============================================== */

function assertRegularSeason(state: LeagueState): boolean {
  if (state.meta.phase !== "REGULAR_SEASON") {
    console.warn(
      "⛔ handleSimSeason blocked: invalid phase",
      state.meta.phase
    );
    return false;
  }
  return true;
}

/* ==============================================
   MAIN ENTRY
============================================== */

export function handleSimSeason(state: LeagueState): LeagueState {
  // 🚨 PHASE A ENFORCEMENT
  if (!assertRegularSeason(state)) {
    return state;
  }

  let next = state;

  const seasonId = state.pointers.seasonId;
  if (!seasonId) {
    console.warn("⚠️ handleSimSeason: no seasonId in pointers");
    return state;
  }

  let season = next.seasons[seasonId];
  if (!season) {
    console.warn("⚠️ handleSimSeason: season not found", seasonId);
    return state;
  }

  console.log("🏁 handleSimSeason ENTER", {
    year: season.year,
    status: season.status,
    games: season.gameIds.length,
    index: season.currentGameIndex,
  });

  /* --------------------------------------------
     1️⃣ INITIALIZE SEASON (ONCE)
  -------------------------------------------- */
  if (season.status === "scheduled") {
    console.log("📅 Initializing season schedule");

    const gameIds = generateSchedule(season.teamIds);

    const standings: Season["standings"] = {};
    for (const teamId of season.teamIds) {
      standings[teamId] = {
        wins: 0,
        losses: 0,
        runsFor: 0,
        runsAgainst: 0,
      };
    }

    season = {
      ...season,
      gameIds,
      standings,
      currentGameIndex: 0,
      status: "active",
    };

    next = {
      ...next,
      seasons: {
        ...next.seasons,
        [seasonId]: season,
      },
    };
  }

  /* --------------------------------------------
     2️⃣ SIM ALL REMAINING GAMES (BATCH)
  -------------------------------------------- */
  while (
    next.seasons[seasonId].currentGameIndex <
    next.seasons[seasonId].gameIds.length
  ) {
    const s = next.seasons[seasonId];
    const gameId = s.gameIds[s.currentGameIndex];

    console.log(
      `🎮 Batch sim ${s.currentGameIndex + 1}/${s.gameIds.length}`,
      gameId
    );

    next = simGameBatch(next, seasonId, gameId);
  }

  /* --------------------------------------------
     3️⃣ FINALIZE SEASON
  -------------------------------------------- */
  season = next.seasons[seasonId];

  if (season.status !== "complete") {
    console.log("🏆 Season complete", season.year);

    next = {
      ...next,
      seasons: {
        ...next.seasons,
        [seasonId]: {
          ...season,
          status: "complete",
        },
      },
    };
  }

  console.log("🏁 handleSimSeason EXIT");
  return next;
}

/* ==============================================
   HELPERS
============================================== */

/**
 * Simple round-robin schedule (dev-safe).
 */
function generateSchedule(teamIds: EntityId[]): EntityId[] {
  const games: EntityId[] = [];

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      for (let k = 0; k < GAMES_PER_OPPONENT; k++) {
        games.push(
          `game_${teamIds[i]}_${teamIds[j]}_${k}` as EntityId
        );
      }
    }
  }

  return shuffle(games);
}

/**
 * Fisher–Yates shuffle.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
