// types/game.ts
import type { BaseEntity, EntityId } from "./base";
import type { BoxScore } from "./boxScore";

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

  /** Final-only fields */
  winningTeamId?: EntityId;
  losingTeamId?: EntityId;
  endedAt?: number;

  /** Frozen snapshot at game end */
  boxScore?: BoxScore;
};
