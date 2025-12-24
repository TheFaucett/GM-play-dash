import type { BaseEntity, EntityId } from "./base";

export type RunnerState =
  | { type: "empty" }
  | { type: "first"; runner1: EntityId }
  | { type: "second"; runner2: EntityId }
  | { type: "third"; runner3: EntityId }
  | { type: "first_second"; runner1: EntityId; runner2: EntityId }
  | { type: "first_third"; runner1: EntityId; runner3: EntityId }
  | { type: "second_third"; runner2: EntityId; runner3: EntityId }
  | { type: "loaded"; runner1: EntityId; runner2: EntityId; runner3: EntityId };

export type HalfInning = BaseEntity & {
  gameId: EntityId;

  inningNumber: number;
  side: "top" | "bottom";

  battingTeamId: EntityId;
  fieldingTeamId: EntityId;

  outs: number; // 0–3 only
  runnerState: RunnerState;

  /** Defensive context (Step 21) */
  defense: {
    infield: EntityId[];   // 1B, 2B, SS, 3B (order irrelevant for now)
    outfield: EntityId[];  // LF, CF, RF
  };
  lineupIndex: number; // 0–8 only
  atBatIds: EntityId[];
  currentAtBatId?: EntityId;
};
