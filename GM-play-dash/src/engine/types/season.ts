// src/engine/types/season.ts

import type { BaseEntity, EntityId } from "./base";
import type { BatterSeasonStats } from "./seasonStats";

export type SeasonStatus =
  | "scheduled"
  | "active"
  | "complete";

export type Season = BaseEntity & {
  id: EntityId;

  year: number;

  /**
   * Regular season day counter
   */
  day: number;

  /**
   * Offseason progression counter (v1)
   * Exists ONLY when phase === OFFSEASON
   */
  offseasonDay?: number;

  status: SeasonStatus;

  teamIds: EntityId[];
  gameIds: EntityId[];
  currentGameIndex: number;

  standings: Record<
    EntityId,
    {
      wins: number;
      losses: number;
      runsFor: number;
      runsAgainst: number;
    }
  >;

  seasonStats: {
    batters: Record<EntityId, BatterSeasonStats>;
    teams: Record<EntityId, unknown>;
  };
};
