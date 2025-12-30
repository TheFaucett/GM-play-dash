// src/engine/reducer/handlers/handleSimSeason.ts

import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { Season } from "../../types/season";

import { handleSimGame } from "./simGame";

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

  /* --------------------------------------------
     1️⃣ Initialize season (day 0)
  -------------------------------------------- */

  if (season.day === 0 && season.gameIds.length === 0) {
    const teamIds = season.teamIds;

    const gameIds = generateSchedule(teamIds);

    const standings: Season["standings"] = {};
    for (const id of teamIds) {
      standings[id] = {
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
     2️⃣ Simulate all remaining games
  -------------------------------------------- */

  for (const gameId of season.gameIds) {
    // Ensure game exists (stub-safe)
    if (!next.games[gameId]) {
      next = createGameFromSchedule(next, gameId);
    }

    // Sim entire game
    next = handleSimGame(next);

    // Apply result to standings
    next = applyGameResultToStandings(next, seasonId, gameId);

    // Recover players after each game
    next = recoverPlayers(next);

    // Advance season day
    season = {
      ...next.seasons[seasonId],
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

  return next;
}

/* ==============================================
   INTERNAL HELPERS
============================================== */

/**
 * Generates a simple round-robin schedule.
 * Not MLB-accurate by design.
 */
function generateSchedule(teamIds: EntityId[]): EntityId[] {
  const games: EntityId[] = [];

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      for (let k = 0; k < GAMES_PER_OPPONENT; k++) {
        games.push(`game_${teamIds[i]}_${teamIds[j]}_${k}`);
      }
    }
  }

  return shuffle(games);
}

/**
 * Fatigue recovery between games.
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

  return {
    ...state,
    players,
  };
}

/**
 * Apply final game result to standings.
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

  const homeId = game.homeTeamId;
  const awayId = game.awayTeamId;
  const homeRuns = game.score.home;
  const awayRuns = game.score.away;

  updateTeamStanding(
    standings,
    homeId,
    homeRuns > awayRuns,
    homeRuns,
    awayRuns
  );

  updateTeamStanding(
    standings,
    awayId,
    awayRuns > homeRuns,
    awayRuns,
    homeRuns
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

function updateTeamStanding(
  standings: Season["standings"],
  teamId: EntityId,
  win: boolean,
  runsFor: number,
  runsAgainst: number
) {
  const r = standings[teamId];
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

/**
 * Stub: create a Game entity from a schedule ID.
 * Safe placeholder until schedule system is richer.
 */
function createGameFromSchedule(
  state: LeagueState,
  gameId: EntityId
): LeagueState {
  return state;
}
