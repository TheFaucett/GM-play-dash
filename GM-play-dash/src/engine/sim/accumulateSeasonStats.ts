import type { LeagueState } from "../types/league";
import type { BoxScore } from "../types/boxScore";

export function accumulateSeasonStats(
  state: LeagueState,
  seasonId: string,
  boxScore: BoxScore
): LeagueState {
  const season = state.seasons[seasonId];
  if (!season) return state;

  const nextTeams = { ...season.seasonStats.teams };
  const nextBatters = { ...season.seasonStats.batters };

  // ---- TEAM STATS ----
  for (const side of ["home", "away"] as const) {
    const teamBox = boxScore.teams[side];
    const teamId = teamBox.teamId;

    const prev =
      nextTeams[teamId] ?? {
        teamId,
        G: 0,
        W: 0,
        L: 0,
        runsFor: 0,
        runsAgainst: 0,
      };

    const won = boxScore.summary.winnerTeamId === teamId;

    nextTeams[teamId] = {
      ...prev,
      G: prev.G + 1,
      W: prev.W + (won ? 1 : 0),
      L: prev.L + (won ? 0 : 1),
      runsFor: prev.runsFor + teamBox.runs,
      runsAgainst:
        prev.runsAgainst +
        (side === "home"
          ? boxScore.teams.away.runs
          : boxScore.teams.home.runs),
    };
  }

  // ---- BATTER STATS ----
  for (const line of Object.values(boxScore.batting)) {
    const prev =
      nextBatters[line.playerId] ?? {
        playerId: line.playerId,
        G: 0,
        AB: 0,
        H: 0,
        R: 0,
        RBI: 0,
        BB: 0,
        SO: 0,
      };

    nextBatters[line.playerId] = {
      ...prev,
      G: prev.G + 1,
      AB: prev.AB + line.AB,
      H: prev.H + line.H,
      R: prev.R + line.R,
      RBI: prev.RBI + line.RBI,
      BB: prev.BB + line.BB,
      SO: prev.SO + line.SO,
    };
  }

  return {
    ...state,
    seasons: {
      ...state.seasons,
      [seasonId]: {
        ...season,
        seasonStats: {
          ...season.seasonStats,
          teams: nextTeams,
          batters: nextBatters,
        },
      },
    },
  };
}
