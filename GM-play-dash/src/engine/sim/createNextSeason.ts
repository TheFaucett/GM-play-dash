// src/engine/sim/createNextSeason.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Season } from "../types/season";

import { revalueAllPlayers } from "./revalueAllPlayers";

/**
 * Creates the next season and moves league back into REGULAR_SEASON.
 *
 * HARD GUARANTEES:
 * - Preserves rng + intent state
 * - Preserves existing seasons/games history
 * - Creates a fresh Season stub (scheduled, day=0)
 * - Reasserts pointers.seasonId to the new season
 * - Clears gameplay pointers (game/half/atBat)
 * - Revalues all players once at rollover (Phase B baseline)
 *
 * DOES NOT (yet):
 * - Generate schedule (gameIds)
 * - Auto-start any game
 * - Modify contracts/teams/rosters (other than revalue)
 */
export function createNextSeason(state: LeagueState): LeagueState {
  const now = Date.now();

  const currentSeasonId = state.pointers.seasonId as EntityId | undefined;
  const currentSeason = currentSeasonId
    ? state.seasons[currentSeasonId]
    : undefined;

  if (!currentSeasonId || !currentSeason) {
    console.warn("⛔ createNextSeason blocked: no current season in pointers");
    return state;
  }

  // We only want to roll over from a completed season (your offseason pipeline).
  if (currentSeason.status !== "complete") {
    console.warn("⛔ createNextSeason blocked: season not complete", {
      seasonId: currentSeasonId,
      status: currentSeason.status,
    });
    return state;
  }

  const nextYear = currentSeason.year + 1;

  // Prefer the canonical list of teams from the season we just completed.
  const teamIds = currentSeason.teamIds ?? (Object.keys(state.teams) as EntityId[]);

  // Build fresh standings
  const standings: Season["standings"] = {};
  for (const tid of teamIds) {
    standings[tid] = {
      wins: 0,
      losses: 0,
      runsFor: 0,
      runsAgainst: 0,
    };
  }

  // Ensure unique season id (in case you ever generate multiple seasons for same year in dev)
  let nextSeasonId = `season_${nextYear}` as EntityId;
  if (state.seasons[nextSeasonId]) {
    let suffix = 2;
    while (state.seasons[`season_${nextYear}_${suffix}` as EntityId]) suffix++;
    nextSeasonId = `season_${nextYear}_${suffix}` as EntityId;
  }

  const nextSeason: Season = {
    id: nextSeasonId,
    createdAt: now,
    updatedAt: now,

    year: nextYear,
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

    // NOTE: optional field in your codebase; safe to include even if Season type
    // already has it, and if it doesn't, you'll see a TS error here (which means
    // Season type needs the optional field).
    offseasonDay: 0 as any,
  } as Season;

  // Authoritative rollover (no schedule yet)
  let nextState: LeagueState = {
    ...state,

    meta: {
      ...state.meta,
      phase: "REGULAR_SEASON",
    },

    pointers: {
      ...state.pointers,
      seasonId: nextSeasonId,
      gameId: undefined,
      halfInningId: undefined,
      atBatId: undefined,
    },

    seasons: {
      ...state.seasons,
      [nextSeasonId]: nextSeason,
    },

    log: [
      ...state.log,
      {
        id: `log_create_next_season_${nextSeasonId}_${now}`,
        timestamp: now,
        type: "CREATE_NEXT_SEASON",
        refs: [currentSeasonId, nextSeasonId],
        description: `Created season ${nextYear} from rollover (prev: ${currentSeason.year})`,
      },
    ],
  };

  // Phase B baseline: revalue everyone at rollover.
  nextState = revalueAllPlayers(nextState);

  console.log("✅ createNextSeason complete", {
    from: currentSeasonId,
    to: nextSeasonId,
    year: nextYear,
    teamCount: teamIds.length,
    phase: nextState.meta.phase,
  });

  return nextState;
}
