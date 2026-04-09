// src/engine/reducer/handlers/newLeague.ts

import type { LeagueState } from "../../types/league";
import type { NewLeagueAction } from "../../actions/types";
import type { TeamMarketSize } from "../../types/team";
import type { EntityId } from "../../types/base";
import { initTeamIntent } from "../../sim/initTeamIntent";

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

/**
 * ✅ STEP 2: Real budget base by market size (in $M).
 * This is the "league economy" anchor.
 */
function marketBaseBudget(size: TeamMarketSize): number {
  switch (size) {
    case "small":
      return 95;
    case "mid":
      return 140;
    case "large":
      return 200;
  }
}

/**
 * ✅ STEP 2: Convert market identity -> team budget in $M.
 * Deterministic + stable.
 */
function computeTeamBudget(size: TeamMarketSize): number {
  const factor = marketBudgetFactor(size);
  return Math.round(marketBaseBudget(size) * factor);
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

  const homeBudgetFactor = marketBudgetFactor(homeMarket);
  const awayBudgetFactor = marketBudgetFactor(awayMarket);

  const homeBudget = computeTeamBudget(homeMarket);
  const awayBudget = computeTeamBudget(awayMarket);

  /* --------------------------------------------
     BASE LEAGUE STATE
  -------------------------------------------- */

  const baseState: LeagueState = {
    /* --------------------------------------------
       META / RNG
    -------------------------------------------- */

    meta: {
      schemaVersion: 1,
      createdAt: now,
      phase: "OFFSEASON", // team selection lives here
      userTeamId: null,
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

    tradeInbox: {},
    teams: {
      [homeTeamId]: {
        id: homeTeamId,
        name: "New York Titans",

        marketSize: homeMarket,
        budgetFactor: homeBudgetFactor,

        // ✅ NEW FIELDS (Team type update)
        budget: homeBudget,
        cash: homeBudget, // v1: start cash = budget

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
        budgetFactor: awayBudgetFactor,

        // ✅ NEW FIELDS (Team type update)
        budget: awayBudget,
        cash: awayBudget, // v1: start cash = budget

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
       INTENT STATE
    -------------------------------------------- */

    playerIntent: {},
    teamIntent: {},

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

  /* --------------------------------------------
     INITIALIZE TEAM INTENT
  -------------------------------------------- */

  return {
    ...baseState,
    teamIntent: initTeamIntent(baseState),
  };
}