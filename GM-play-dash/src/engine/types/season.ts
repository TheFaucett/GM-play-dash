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
 * Canonical Season type
 * - Drives sim progression
 * - Holds standings
 * - Aggregates stats
 */
export type Season = BaseEntity & {
  /** Year label (e.g. 2029) */
  year: number;

  /** Current sim day (increments per game or batch) */
  day: number;

  /** Participating teams */
  teamIds: EntityId[];

  /** All scheduled games in order */
  gameIds: EntityId[];

  /** Pointer into gameIds for sim */
  currentGameIndex: number;

  /** Season lifecycle */
  status: SeasonStatus;

  /* --------------------------------------------
     STANDINGS (lightweight, fast lookup)
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
