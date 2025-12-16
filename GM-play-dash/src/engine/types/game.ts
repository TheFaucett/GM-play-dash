import type { BaseEntity, EntityId } from "./base";

export type GameStatus = "scheduled" | "in_progress" | "final";

export type Game = BaseEntity & {
  seasonId: EntityId;

  homeTeamId: EntityId;
  awayTeamId: EntityId;

  status: GameStatus;

  score: {
    home: number;
    away: number;
  };

  /** Ordered list of half-innings */
  halfInningIds: EntityId[];
  currentHalfInningId?: EntityId;
};
