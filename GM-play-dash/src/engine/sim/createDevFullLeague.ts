import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Player, PlayerRole } from "../types/player";
import type { Team } from "../types/team";
import type { Season } from "../types/season";

import { generatePlayer } from "./generatePlayer";

/* ---------------------------------------------
   TEMP NAME GENERATOR (DEV-SAFE)
--------------------------------------------- */
function fallbackName(i: number) {
  return `Player ${i + 1}`;
}

/**
 * Creates a full dev league:
 * - Teams
 * - Players
 * - Valid rosters
 * - Season stub (new Season typing)
 *
 * This is intentionally "god mode" and deterministic.
 */
export function createDevFullLeague(args: {
  seed: number;
  year: number;
  teamCount?: number;
  rosterSize?: number; // default 26
}): LeagueState {
  const now = Date.now();

  const teamCount = args.teamCount ?? 30;
  const rosterSize = args.rosterSize ?? 26;

  /* ---------------------------------------------
     BASE LEAGUE STATE
  --------------------------------------------- */
  const state: LeagueState = {
    meta: {
      schemaVersion: 1,
      createdAt: now,
    },

    rng: {
      seed: args.seed,
      cursor: 0,
    },

    pointers: {},

    players: {},
    teams: {},
    seasons: {},
    games: {},
    halfInnings: {},
    atBats: {},
    pitches: {},
    log: [],
  };

  /* ---------------------------------------------
     DEV TEAM NAMES
  --------------------------------------------- */
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

  /* ---------------------------------------------
     ROSTER ROLE MIX
  --------------------------------------------- */
  function roleForIndex(i: number): PlayerRole {
    if (i < 5) return "SP";
    if (i < 12) return "RP";
    if (i === 12) return "CL";
    return "BAT";
  }

  /* ---------------------------------------------
     CREATE TEAMS + PLAYERS
  --------------------------------------------- */
  let globalPlayerIndex = 0;

  for (let t = 0; t < teamCount; t++) {
    const teamId = `team_${t}` as EntityId;
    teamIds.push(teamId);

    const name = teamNames[t] ?? `Team ${t + 1}`;

    const lineup: EntityId[] = [];
    const rotation: EntityId[] = [];
    const bullpen: EntityId[] = [];

    for (let j = 0; j < rosterSize; j++) {
      const role = roleForIndex(j);
      const playerId = `p_${t}_${j}` as EntityId;

      const player = generatePlayer({
        id: playerId,
        name: fallbackName(globalPlayerIndex++),
        age: 18 + Math.floor(Math.random() * 18),
        teamId,
        level: "MLB",
        role,
        seed: args.seed + t * 1000 + j,
      });

      state.players[playerId] = player;

      if (role === "BAT" && lineup.length < 9) {
        lineup.push(playerId);
      } else if (role === "SP") {
        rotation.push(playerId);
      } else if (role !== "BAT") {
        bullpen.push(playerId);
      }
    }

    const activePitcherId =
      rotation[0] ?? bullpen[0] ?? lineup[0];

    const team: Team = {
      id: teamId,
      name,

      lineup,
      lineupIndex: 0,

      rotation,
      bullpen,

      activePitcherId,
    };

    state.teams[teamId] = team;
  }

  /* ---------------------------------------------
     CREATE SEASON (NEW CANONICAL SHAPE)
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

    currentGameIndex: 0,   // ✅ REQUIRED
    status: "scheduled",  // ✅ REQUIRED

    standings,

    seasonStats: {
      batters: {},
      teams: {},
    },
  };

  state.seasons[seasonId] = season;

  /* ---------------------------------------------
     POINTERS
  --------------------------------------------- */
  state.pointers.seasonId = seasonId;

  return state;
}
