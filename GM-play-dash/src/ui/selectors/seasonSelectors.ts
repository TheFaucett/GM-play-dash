// src/ui/selectors/seasonSelectors.ts

import type { LeagueState } from "../../engine/types/league";
import type { BatterSeasonStats, TeamSeasonStats } from "../../engine/types/seasonStats";
import type { EntityId } from "../../engine/types/base";

/* ==============================================
   BASIC ACCESS
============================================== */

export function getActiveSeason(state: LeagueState) {
  const seasonId = state.pointers.seasonId;
  if (!seasonId) return null;

  return state.seasons[seasonId] ?? null;
}

/* ==============================================
   STANDINGS
============================================== */

export type StandingRow = {
  teamId: EntityId;
  teamName: string;
  wins: number;
  losses: number;
  games: number;
  runsFor: number;
  runsAgainst: number;
  runDiff: number;
};

export function getStandings(state: LeagueState): StandingRow[] {
  const season = getActiveSeason(state);
  if (!season) return [];

  return Object.entries(season.standings)
    .map(([teamId, record]) => {
      const team = state.teams[teamId];

      const wins = record.wins;
      const losses = record.losses;
      const runsFor = record.runsFor ?? 0;
      const runsAgainst = record.runsAgainst ?? 0;

      return {
        teamId,
        teamName: team?.name ?? teamId,
        wins,
        losses,
        games: wins + losses,
        runsFor,
        runsAgainst,
        runDiff: runsFor - runsAgainst,
      };
    })
    .sort((a, b) => {
      // Primary: wins
      if (b.wins !== a.wins) return b.wins - a.wins;
      // Secondary: run differential
      return b.runDiff - a.runDiff;
    });
}

/* ==============================================
   BATTER LEADERBOARD
============================================== */

export type BatterRow = {
  playerId: EntityId;
  name: string;
  teamName: string;
  G: number;
  AB: number;
  H: number;
  AVG: number;
  BB: number;
  SO: number;
};

export function getTopBatters(
  state: LeagueState,
  limit = 10,
  minAB = 50
): BatterRow[] {
  const season = getActiveSeason(state);
  if (!season) return [];

  const rows: BatterRow[] = [];

  for (const stats of Object.values(season.seasonStats.batters)) {
    if (stats.AB < minAB) continue;

    const player = state.players[stats.playerId];
    if (!player) continue;

    const avg =
      stats.AB > 0 ? Number((stats.H / stats.AB).toFixed(3)) : 0;

    rows.push({
      playerId: stats.playerId,
      name: player.name,
      teamName: state.teams[player.teamId]?.name ?? player.teamId,
      G: stats.G,
      AB: stats.AB,
      H: stats.H,
      AVG: avg,
      BB: stats.BB,
      SO: stats.SO,
    });
  }

  return rows
    .sort((a, b) => b.AVG - a.AVG)
    .slice(0, limit);
}
