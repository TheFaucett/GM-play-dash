import type { BaseEntity, EntityId } from "./base";

export type TeamLevel = "MLB" | "AAA" | "AA" | "A" | "R";

export type Team = BaseEntity & {
  name: string;
  abbrev: string;
  level: TeamLevel;

  /** Parent org (undefined for MLB) */
  parentTeamId?: EntityId;

  /** Roster = player IDs */
  roster: EntityId[];

  /** Roles & usage */
  depthChart: {
    starters: EntityId[];
    bullpen: EntityId[];
    lineup: EntityId[];
  };

  /** AI / sim tendencies (optional, future-proof) */
  tendencies?: {
    hookAggression?: number;
    stealAggression?: number;
  };
};
