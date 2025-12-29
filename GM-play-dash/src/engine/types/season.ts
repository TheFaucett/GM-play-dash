import type { BaseEntity, EntityId } from "./base";
import type { BatterSeasonStats, TeamSeasonStats } from "./seasonStats";
export type Season = BaseEntity & {
  year: number;
  day: number; // current sim day

  teamIds: EntityId[];
  gameIds: EntityId[];
  seasonStats: {
    batters: Record<EntityId, BatterSeasonStats>;
    teams: Record<EntityId, TeamSeasonStats>;
  };
  standings: Record<EntityId, {
    wins: number;
    losses: number;
  }>;
};
