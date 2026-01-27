// src/engine/reducer/handlers/newLeague.ts

import type { LeagueState } from "../../types/league";
import type { NewLeagueAction } from "../../actions/types";
import type { TeamMarketSize } from "../../types/team";
import type { EntityId } from "../../types/base";

/* ==============================================
   HELPERS
============================================== */

function marketBudgetFactor(size: TeamMarketSize): number {
  switch (size) {
    case "small":
      return 0.75;
    case "mid":
      return 1.0;
    case "large":
      return 1.3;
  }
}

/* ==============================================
   HANDLER
============================================== */

export function handleNewLeague(
  _: LeagueState,
  action: NewLeagueAction
): LeagueState {
  const now = Date.now();

  const homeTeamId: EntityId = "team_home";
  const awayTeamId: EntityId = "team_away";

  const homeMarket: TeamMarketSize = "large";
  const awayMarket: TeamMarketSize = "mid";

  return {
    /* --------------------------------------------
       META / RNG
    -------------------------------------------- */

    meta: {
      schemaVersion: 1,
      createdAt: now,
      phase: "OFFSEASON",   // ✅ team selection lives here
      userTeamId: null,     // ✅ REQUIRED by MetaState
    },

    rng: {
      seed: action.payload.seed,
      cursor: 0,
    },

    pointers: {},

    /* --------------------------------------------
       PLAYERS
    -------------------------------------------- */

    players: {},

    /* --------------------------------------------
       TEAMS
    -------------------------------------------- */

    teams: {
      [homeTeamId]: {
        id: homeTeamId,
        name: "New York Titans",

        marketSize: homeMarket,
        budgetFactor: marketBudgetFactor(homeMarket),

        lineup: [],
        lineupIndex: 0,

        rotation: [],
        bullpen: [],

        activePitcherId: undefined,
      },

      [awayTeamId]: {
        id: awayTeamId,
        name: "Kansas City Kings",

        marketSize: awayMarket,
        budgetFactor: marketBudgetFactor(awayMarket),

        lineup: [],
        lineupIndex: 0,

        rotation: [],
        bullpen: [],

        activePitcherId: undefined,
      },
    },

    /* --------------------------------------------
       SIM STATE
    -------------------------------------------- */

    seasons: {},
    games: {},
    halfInnings: {},
    atBats: {},
    pitches: {},

    /* --------------------------------------------
       LOG
    -------------------------------------------- */

    log: [
      {
        id: "log_0",
        timestamp: now,
        type: "NEW_LEAGUE",
        description: "New league created (offseason)",
      },
    ],
  };
}
