// src/engine/types/season.ts

import type { BaseEntity, EntityId } from "./base";
import type {
  BatterSeasonStats,
  TeamSeasonStats,
} from "./seasonStats";

/* ==============================================
   SEASON TYPES
============================================== */

export type SeasonStatus =
  | "scheduled"
  | "active"
  | "complete";

/**
 * Canonical Season entity
 *
 * - Owns schedule order
 * - Tracks sim progression
 * - Holds standings + aggregate stats
 * - Is the authoritative season record
 */
export type Season = BaseEntity & {
  /** Season label (e.g. 2029) */
  year: number;

  /** Current sim day (advances with games) */
  day: number;

  /** Participating teams */
  teamIds: EntityId[];

  /** Ordered list of scheduled games */
  gameIds: EntityId[];

  /** Pointer into gameIds during sim */
  currentGameIndex: number;

  /** Season lifecycle state */
  status: SeasonStatus;

  /* --------------------------------------------
     STANDINGS (fast lookup, lightweight)
  -------------------------------------------- */
  standings: Record<
    EntityId,
    {
      wins: number;
      losses: number;
      runsFor?: number;
      runsAgainst?: number;
    }
  >;

  /* --------------------------------------------
     SEASON STATS (authoritative totals)
  -------------------------------------------- */
  seasonStats: {
    batters: Record<EntityId, BatterSeasonStats>;
    teams: Record<EntityId, TeamSeasonStats>;
  };
};
