// src/engine/sim/accumulateSeasonStats.ts
//
// Purpose:
// - Apply a finished game's BoxScore into season totals (teams + batters)
// - ALSO (new): store lightweight per-player "checkpoints" so you can write
//   narrative blurbs like "hot second half" without re-simming.
//
// Design:
// - Checkpoints are append-only derived snapshots (NOT authoritative)
// - Cheap to store: a tiny stat bundle per game per player
// - Later you can derive splits: first half / second half / last 30 days by diffing snapshots

import type { LeagueState } from "../types/league";
import type { BoxScore } from "../types/boxScore";
import type { EntityId } from "../types/base";

/* ======================================================
   TYPES (local + additive; safe even if Season doesn't
   yet declare these fields)
====================================================== */

type BatterCheckpoint = {
  day: number;
  // cumulative totals at this day
  G: number;
  AB: number;
  H: number;
  R: number;
  RBI: number;
  BB: number;
  SO: number;

  // optional if you add later
  HR?: number;
};

type PitcherCheckpoint = {
  day: number;
  G: number;
  IP: number;
  ER: number;
  H: number;
  BB: number;
  SO: number;
  HR?: number;
};

type SeasonNarrativeCache = {
  // append-only cumulative checkpoints per player
  batterCheckpointsByPlayerId: Record<EntityId, BatterCheckpoint[]>;
  pitcherCheckpointsByPlayerId: Record<EntityId, PitcherCheckpoint[]>;
};

function getNarrativeCache(season: any): SeasonNarrativeCache {
  const existing = season?.narrativeCache as SeasonNarrativeCache | undefined;

  return (
    existing ?? {
      batterCheckpointsByPlayerId: {},
      pitcherCheckpointsByPlayerId: {},
    }
  );
}

function pushCheckpoint<T extends { day: number }>(
  list: T[] | undefined,
  next: T
): T[] {
  if (!list || list.length === 0) return [next];

  // Prevent accidental double-apply for the same day
  const last = list[list.length - 1];
  if (last?.day === next.day) return list;

  return [...list, next];
}

/* ======================================================
   MAIN
====================================================== */

export function accumulateSeasonStats(
  state: LeagueState,
  seasonId: string,
  boxScore: BoxScore
): LeagueState {
  const season = state.seasons[seasonId];
  if (!season) return state;

  // Prefer season.day as the canonical calendar (your sim tick)
  const day = typeof (season as any).day === "number" ? (season as any).day : 0;

  const nextTeams = { ...season.seasonStats.teams };
  const nextBatters = { ...season.seasonStats.batters };

  // Optional: if you later add pitchers to seasonStats, support it safely.
  const nextPitchers = {
    ...(season.seasonStats as any).pitchers,
  } as Record<string, any>;

  /* ---------------------------------------------
     TEAM STATS
  --------------------------------------------- */
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

  /* ---------------------------------------------
     BATTER STATS
  --------------------------------------------- */
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
      // If your box score later includes HR, you can accumulate it here.
      ...(typeof (line as any).HR === "number"
        ? { HR: (prev as any).HR + (line as any).HR }
        : null),
    };
  }

  /* ---------------------------------------------
     PITCHER STATS (OPTIONAL)
     If your BoxScore has pitching lines, we accumulate them.
     If not present, this is a no-op.
  --------------------------------------------- */
  const pitching = (boxScore as any).pitching as
    | Record<string, any>
    | undefined;

  if (pitching) {
    for (const line of Object.values(pitching)) {
      const id = (line as any).playerId as string | undefined;
      if (!id) continue;

      const prev =
        nextPitchers[id] ?? {
          playerId: id,
          G: 0,
          IP: 0,
          ER: 0,
          H: 0,
          BB: 0,
          SO: 0,
          HR: 0,
        };

      nextPitchers[id] = {
        ...prev,
        G: prev.G + 1,
        IP: prev.IP + ((line as any).IP ?? 0),
        ER: prev.ER + ((line as any).ER ?? 0),
        H: prev.H + ((line as any).H ?? 0),
        BB: prev.BB + ((line as any).BB ?? 0),
        SO: prev.SO + ((line as any).SO ?? 0),
        HR: prev.HR + ((line as any).HR ?? 0),
      };
    }
  }

  /* ---------------------------------------------
     NARRATIVE CHECKPOINTS (NEW)
     Store a cumulative snapshot for each player that appeared.
     This lets you derive splits later by diffing checkpoints.
  --------------------------------------------- */
  const cache = getNarrativeCache(season);

  const nextBatterCk: SeasonNarrativeCache["batterCheckpointsByPlayerId"] = {
    ...cache.batterCheckpointsByPlayerId,
  };

  // Only add checkpoints for players who appeared in this game (cheap)
  for (const line of Object.values(boxScore.batting)) {
    const id = line.playerId as EntityId;

    const totals = nextBatters[id];
    if (!totals) continue;

    const ck: BatterCheckpoint = {
      day,
      G: totals.G,
      AB: totals.AB,
      H: totals.H,
      R: totals.R,
      RBI: totals.RBI,
      BB: totals.BB,
      SO: totals.SO,
      ...(typeof (totals as any).HR === "number" ? { HR: (totals as any).HR } : null),
    };

    nextBatterCk[id] = pushCheckpoint(nextBatterCk[id], ck);
  }

  const nextPitcherCk: SeasonNarrativeCache["pitcherCheckpointsByPlayerId"] = {
    ...cache.pitcherCheckpointsByPlayerId,
  };

  if (pitching) {
    for (const line of Object.values(pitching)) {
      const id = (line as any).playerId as EntityId | undefined;
      if (!id) continue;

      const totals = nextPitchers[id];
      if (!totals) continue;

      const ck: PitcherCheckpoint = {
        day,
        G: totals.G,
        IP: totals.IP,
        ER: totals.ER,
        H: totals.H,
        BB: totals.BB,
        SO: totals.SO,
        ...(typeof totals.HR === "number" ? { HR: totals.HR } : null),
      };

      nextPitcherCk[id] = pushCheckpoint(nextPitcherCk[id], ck);
    }
  }

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
          ...season.seasonStats,
          teams: nextTeams,
          batters: nextBatters,
          // only add pitchers if your seasonStats supports it; otherwise it just sits there harmlessly
          ...(pitching ? { pitchers: nextPitchers } : null),
        },
        // Additive, safe cache (derived, not authoritative)
        narrativeCache: {
          batterCheckpointsByPlayerId: nextBatterCk,
          pitcherCheckpointsByPlayerId: nextPitcherCk,
        },
      } as any,
    },
  };
}