import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { PlayerRole, Player } from "../types/player";
import type { Team, TeamMarketSize } from "../types/team";
import type { Season } from "../types/season";
import type { PlayerContract } from "../types/player";

import { generatePlayer } from "./generatePlayer";
import { initPlayerIntent } from "../sim/initPlayerIntent";
import { initTeamIntent } from "../sim/initTeamIntent";
import { revalueAllPlayers } from "./revalueAllPlayers";

/* ---------------------------------------------
   MARKET HELPERS
--------------------------------------------- */
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

function marketForIndex(i: number): TeamMarketSize {
  if (i < 6) return "large";
  if (i < 16) return "mid";
  return "small";
}

/* ---------------------------------------------
   CONTRACT GENERATOR
--------------------------------------------- */
function generateContract(
  player: Player,
  marketFactor: number,
  currentYear: number
): PlayerContract {
  const age = player.age ?? 25;
  const ovr =
    (player as any).ovr ??
    (player as any).ratings?.ovr ??
    65;

  // --- Pre-arb young players ---
  if (age <= 24) {
    const aav = Math.floor(800_000 * marketFactor);
    return {
      yearsRemaining: 3,
      annualSalary: aav,
      totalValue: aav * 3,
      signedYear: currentYear,
      type: "prearb",
    };
  }

  // --- Stars ---
  if (ovr >= 80) {
    const years = 5 + Math.floor(Math.random() * 3);
    const aav =
      Math.floor((25_000_000 + Math.random() * 10_000_000) * marketFactor);

    return {
      yearsRemaining: years,
      annualSalary: aav,
      totalValue: aav * years,
      signedYear: currentYear,
      type: "guaranteed",
    };
  }

  // --- Solid regulars ---
  if (ovr >= 70) {
    const years = 3 + Math.floor(Math.random() * 2);
    const aav =
      Math.floor((12_000_000 + Math.random() * 5_000_000) * marketFactor);

    return {
      yearsRemaining: years,
      annualSalary: aav,
      totalValue: aav * years,
      signedYear: currentYear,
      type: "guaranteed",
    };
  }

  // --- Depth / fringe ---
  const aav =
    Math.floor((2_000_000 + Math.random() * 2_000_000) * marketFactor);

  return {
    yearsRemaining: 1,
    annualSalary: aav,
    totalValue: aav,
    signedYear: currentYear,
    type: "guaranteed",
  };
}

/**
 * Creates a full dev league with:
 * - Teams
 * - Large FA player pool
 * - Season stub
 * - Real contracts
 */
export function createDevFullLeague(args: {
  seed: number;
  year: number;
  teamCount?: number;
  rosterSize?: number;
}): LeagueState {
  const now = Date.now();
  const currentYear = args.year;

  const teamCount = args.teamCount ?? 30;
  const playersPerTeam = 170;

  let state: LeagueState = {
    meta: {
      schemaVersion: 1,
      createdAt: now,
      phase: "OFFSEASON",
      userTeamId: null,
    },

    rng: {
      seed: args.seed,
      cursor: 0,
    },

    pointers: {
      seasonId: undefined,
      selectedPlayerId: null,
    },

    players: {},
    teams: {},
    seasons: {},
    games: {},
    halfInnings: {},
    atBats: {},
    pitches: {},

    tradeInbox: {},
    playerIntent: {},
    teamIntent: {},

    log: [],
  };

  const teamNames: string[] = [
    "Anchorage Arms",
    "Juneau Jumpers",
    "Hawaii Shells",
    "Siberian Polar Bears",
    "Portland Pines",
    "Seattle Stormers",
    "Vancouver Voyagers",
    "San Jose Sparks",
    "Las Vegas Vipers",
    "Phoenix Phantoms",
    "Denver Drifters",
    "Dallas Comets",
    "Houston Hounds",
    "Kansas City Kings",
    "St. Louis Sparks",
    "Chicago Grizzlies",
    "Milwaukee Maulers",
    "Detroit Drivers",
    "Cleveland Claws",
    "Cincinnati Cyclones",
    "Atlanta Aces",
    "Miami Miracles",
    "Tampa Tridents",
    "Charlotte Chargers",
    "Washington Whips",
    "Baltimore Blades",
    "Philadelphia Foundry",
    "New York Knights",
    "Boston Beacon",
    "Toronto Talons",
  ];

  const teamIds: EntityId[] = [];

  function roleForIndex(i: number): PlayerRole {
    if (i % 10 < 2) return "SP";
    if (i % 10 < 4) return "RP";
    if (i % 10 === 4) return "CL";
    return "BAT";
  }

  /* ---------------------------------------------
     CREATE TEAMS + PLAYERS (ALL FA INITIALLY)
  --------------------------------------------- */
  for (let t = 0; t < teamCount; t++) {
    const teamId = `team_${t}` as EntityId;
    teamIds.push(teamId);

    const name = teamNames[t] ?? `Team ${t + 1}`;
    const marketSize = marketForIndex(t);

    const team: Team = {
      id: teamId,
      name,
      marketSize,
      budgetFactor: marketBudgetFactor(marketSize),
      lineup: [],
      lineupIndex: 0,
      rotation: [],
      bullpen: [],
      activePitcherId: undefined,
    };

    state.teams[teamId] = team;

    for (let j = 0; j < playersPerTeam; j++) {
      const role = roleForIndex(j);
      const playerId = `p_${t}_${j}` as EntityId;

      state.players[playerId] = generatePlayer({
        id: playerId,
        age: 18 + Math.floor(Math.random() * 18),
        teamId: "FA",
        level: "MLB",
        role,
        seed: args.seed + t * 1000 + j,
      });
    }
  }

  /* ---------------------------------------------
     CREATE SEASON
  --------------------------------------------- */
  const seasonId = `season_${args.year}` as EntityId;

  const standings: Season["standings"] = {};
  for (const id of teamIds) {
    standings[id] = {
      wins: 0,
      losses: 0,
      runsFor: 0,
      runsAgainst: 0,
    };
  }

  const season: Season = {
    id: seasonId,
    createdAt: now,
    updatedAt: now,
    year: args.year,
    day: 0,
    teamIds,
    gameIds: [],
    currentGameIndex: 0,
    status: "scheduled",
    standings,
    seasonStats: {
      batters: {},
      teams: {},
    },
  };

  state.seasons[seasonId] = season;
  state.pointers.seasonId = seasonId;

  /* ---------------------------------------------
     INIT INTENT
  --------------------------------------------- */
  state.playerIntent = initPlayerIntent(state);
  state.teamIntent = initTeamIntent(state);

  /* ---------------------------------------------
     AUTHORITATIVE PLAYER VALUATION
  --------------------------------------------- */
  state = revalueAllPlayers(state);

  /* ---------------------------------------------
     💰 ASSIGN REAL CONTRACTS
  --------------------------------------------- */
  for (const player of Object.values(state.players)) {
    // give contract based on random team market for now
    const randomTeam =
      state.teams[
        teamIds[Math.floor(Math.random() * teamIds.length)]
      ];

    const marketFactor = randomTeam.budgetFactor;

    player.contract = generateContract(
      player,
      marketFactor,
      currentYear
    );
  }

  console.log("📊 Player valuation + contracts complete", {
    players: Object.keys(state.players).length,
  });

  return state;
}
