import type { BaseEntity, EntityId } from "./base";

export type Season = BaseEntity & {
  year: number;
  day: number; // current sim day

  teamIds: EntityId[];
  gameIds: EntityId[];

  standings: Record<EntityId, {
    wins: number;
    losses: number;
  }>;
};
