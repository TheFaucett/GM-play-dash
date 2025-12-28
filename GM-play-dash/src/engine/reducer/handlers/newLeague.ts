import type { LeagueState } from "../../types/league";
import type { NewLeagueAction } from "../../actions/types";

export function handleNewLeague(
  _: LeagueState,
  action: NewLeagueAction
): LeagueState {
  const now = Date.now();

  const homeTeamId = "home";
  const awayTeamId = "away";

  return {
    meta: {
      schemaVersion: 1,
      createdAt: now,
    },

    rng: {
      seed: action.payload.seed,
      cursor: 0,
    },

    pointers: {},

    // Players can be empty for now — IDs are enough for pitch mode
    players: {},

    teams: {
      [homeTeamId]: {
        id: homeTeamId,
        name: "Home",

        // Batting
        lineup: [
          "home_batter_1",
          "home_batter_2",
          "home_batter_3",
          "home_batter_4",
          "home_batter_5",
          "home_batter_6",
          "home_batter_7",
          "home_batter_8",
          "home_batter_9",
        ],
        lineupIndex: 0,

        // Pitching
        rotation: ["home_pitcher_1"],
        bullpen: [],

        // Game state
        activePitcherId: "home_pitcher_1",
      },

      [awayTeamId]: {
        id: awayTeamId,
        name: "Away",

        // Batting
        lineup: [
          "away_batter_1",
          "away_batter_2",
          "away_batter_3",
          "away_batter_4",
          "away_batter_5",
          "away_batter_6",
          "away_batter_7",
          "away_batter_8",
          "away_batter_9",
        ],
        lineupIndex: 0,

        // Pitching
        rotation: ["away_pitcher_1"],
        bullpen: [],

        // Game state
        activePitcherId: "away_pitcher_1",
      },
    },

    seasons: {},
    games: {},
    halfInnings: {},
    atBats: {},
    pitches: {},

    log: [],
  };
}
