// src/engine/sim/applyBoxScoreToSeasonStats.ts

import type { LeagueState } from "../types/league";
import type { BatterSeasonStats, TeamSeasonStats } from "../types/seasonStats";
import type { EntityId } from "../types/base";

export function applyBoxScoreToSeasonStats(
  state: LeagueState,
  seasonId: EntityId,
  gameId: EntityId
): LeagueState {
  const season = state.seasons[seasonId];
  const game = state.games[gameId];

  // Safety: only apply once, only on final games
  if (!season || !game || game.status !== "final" || !game.boxScore) {
    return state;
  }

  const nextBatters: Record<EntityId, BatterSeasonStats> = {
    ...season.seasonStats.batters,
  };

  const nextTeams: Record<EntityId, TeamSeasonStats> = {
    ...season.seasonStats.teams,
  };

  /* ---------------------------------------------
     BATTER STATS (COMBINED BOX SCORE)
     - boxScore.batting contains ALL batters
     - no home/away split by design
  --------------------------------------------- */

  for (const line of Object.values(game.boxScore.batting)) {
    const id = line.playerId;

    const prev =
      nextBatters[id] ??
      {
        playerId: id,
        G: 0,
        AB: 0,
        H: 0,
        R: 0,
        RBI: 0,
        BB: 0,
        SO: 0,
      };

    nextBatters[id] = {
      playerId: id,
      G: prev.G + 1,
      AB: prev.AB + line.AB,
      H: prev.H + line.H,
      R: prev.R + line.R,
      RBI: prev.RBI + line.RBI,
      BB: prev.BB + line.BB,
      SO: prev.SO + line.SO,
    };
  }

  /* ---------------------------------------------
     TEAM STATS
     - use game.score (authoritative)
  --------------------------------------------- */

  const homeWon = game.score.home > game.score.away;
  const awayWon = game.score.away > game.score.home;

  function applyTeam(
    teamId: EntityId,
    won: boolean,
    runsFor: number,
    runsAgainst: number
  ) {
    const prev =
      nextTeams[teamId] ??
      {
        teamId,
        G: 0,
        W: 0,
        L: 0,
        runsFor: 0,
        runsAgainst: 0,
      };

    nextTeams[teamId] = {
      teamId,
      G: prev.G + 1,
      W: prev.W + (won ? 1 : 0),
      L: prev.L + (won ? 0 : 1),
      runsFor: prev.runsFor + runsFor,
      runsAgainst: prev.runsAgainst + runsAgainst,
    };
  }

  applyTeam(game.homeTeamId, homeWon, game.score.home, game.score.away);
  applyTeam(game.awayTeamId, awayWon, game.score.away, game.score.home);

  /* ---------------------------------------------
     COMMIT
  --------------------------------------------- */

  return {
    ...state,
    seasons: {
      ...state.seasons,
      [seasonId]: {
        ...season,
        seasonStats: {
          batters: nextBatters,
          teams: nextTeams,
        },
      },
    },
  };
}
