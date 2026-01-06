// src/engine/reducer/handlers/handleSimSeason.ts

import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { Season } from "../../types/season";

import { createGameFromSchedule } from "../../sim/createGameFromSchedule";
import { simGameBatch } from "../../sim/simGameBatch";
import { handleStartGame } from "./startGame";

/* ==============================================
   CONSTANTS
============================================== */

const GAMES_PER_OPPONENT = 6;
const FATIGUE_RECOVERY_PER_GAME = 15;

/* ==============================================
   MAIN ENTRY
============================================== */

export function handleSimSeason(state: LeagueState): LeagueState {
  let next = state;

  const seasonId = state.pointers.seasonId;
  if (!seasonId) return state;

  let season = next.seasons[seasonId];
  if (!season) return state;

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
    console.log("📅 Initializing season");

    const gameIds = generateSchedule(season.teamIds);

    // ✅ CRITICAL: initialize standings for ALL teams
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
     2️⃣ SIM GAMES SEQUENTIALLY
  -------------------------------------------- */
  while (season.currentGameIndex < season.gameIds.length) {
    const gameId = season.gameIds[season.currentGameIndex];

    console.log(
      `🎮 Simulating game ${season.currentGameIndex + 1}/${season.gameIds.length}`,
      gameId
    );

    // --------------------------------------------
    // 2a️⃣ CREATE GAME IF MISSING
    // --------------------------------------------
    if (!next.games[gameId]) {
      next = createGameFromSchedule(next, seasonId, gameId);
    }

    const game = next.games[gameId];
    if (!game) {
      console.error("❌ Game missing after creation", gameId);
      break;
    }

    // --------------------------------------------
    // 2b️⃣ START GAME (SETS POINTERS)
    // --------------------------------------------
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

    // --------------------------------------------
    // 2c️⃣ SIM GAME (BATCH MODE)
    // --------------------------------------------
    next = simGameBatch(next, seasonId, gameId);

    // --------------------------------------------
    // 2d️⃣ APPLY RESULTS TO STANDINGS
    // --------------------------------------------
    next = applyGameResultToStandings(next, seasonId, gameId);

    // --------------------------------------------
    // 2e️⃣ RECOVER PLAYERS
    // --------------------------------------------
    next = recoverPlayers(next);

    // --------------------------------------------
    // 2f️⃣ ADVANCE SEASON POINTER
    // --------------------------------------------
    season = {
      ...next.seasons[seasonId],
      currentGameIndex:
        next.seasons[seasonId].currentGameIndex + 1,
      day: next.seasons[seasonId].day + 1,
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
     3️⃣ FINALIZE SEASON
  -------------------------------------------- */
  if (season.status !== "complete") {
    console.log("🏆 Season complete", season.year);

    season = {
      ...season,
      status: "complete",
    };

    next = {
      ...next,
      seasons: {
        ...next.seasons,
        [seasonId]: season,
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
 * Simple round-robin schedule.
 * Not MLB-accurate by design.
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
 * Recover fatigue between games.
 */
function recoverPlayers(state: LeagueState): LeagueState {
  const players = { ...state.players };

  for (const id in players) {
    const p = players[id];
    players[id] = {
      ...p,
      fatigue: Math.max(0, p.fatigue - FATIGUE_RECOVERY_PER_GAME),
    };
  }

  return { ...state, players };
}

/**
 * Apply a finished game to season standings.
 */
function applyGameResultToStandings(
  state: LeagueState,
  seasonId: EntityId,
  gameId: EntityId
): LeagueState {
  const game = state.games[gameId];
  if (!game || game.status !== "final") return state;

  const season = state.seasons[seasonId];
  if (!season) return state;

  const standings = { ...season.standings };

  updateTeamStanding(
    standings,
    game.homeTeamId,
    game.score.home > game.score.away,
    game.score.home,
    game.score.away
  );

  updateTeamStanding(
    standings,
    game.awayTeamId,
    game.score.away > game.score.home,
    game.score.away,
    game.score.home
  );

  return {
    ...state,
    seasons: {
      ...state.seasons,
      [seasonId]: {
        ...season,
        standings,
      },
    },
  };
}

/**
 * Defensive standings update.
 */
function updateTeamStanding(
  standings: Season["standings"],
  teamId: EntityId,
  win: boolean,
  runsFor: number,
  runsAgainst: number
) {
  const r = standings[teamId];
  if (!r) {
    console.error("❌ Missing standings entry for team", teamId);
    return;
  }

  r.wins += win ? 1 : 0;
  r.losses += win ? 0 : 1;
  r.runsFor = (r.runsFor ?? 0) + runsFor;
  r.runsAgainst = (r.runsAgainst ?? 0) + runsAgainst;
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
