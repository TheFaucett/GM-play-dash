import type { BaseEntity, EntityId } from "./base";
import type { RunnerState } from "./halfInning";
import type { BattedBallType } from "./battedBall";

export type Count = {
  balls: number;   // 0–4
  strikes: number; // 0–3
};

export type AtBatResult =
  | "strikeout"
  | "walk"
  | "single"
  | "double"
  | "triple"
  | "home_run"
  | "out";

export type AtBatPlay = {
  /** Number of outs recorded on the play (0–2) */
  outsAdded: number;

  /** Runs that score directly from the play */
  runsScored: number;

  /**
   * Optional override for runner state after the play.
   * Used for double plays, sac flies, force outs, etc.
   * If undefined, normal advanceRunners() logic applies.
   */
  runnerStateAfter?: RunnerState;

  /** How the ball was hit (Step 19) */
  battedBallType?: BattedBallType;

  /** Free-form annotation for logs/debugging */
  note?: string;
};



export type AtBat = BaseEntity & {
  halfInningId: EntityId;

  batterId: EntityId;
  pitcherId: EntityId;

  count: Count;

  pitchIds: EntityId[];

  /** Set only when the at-bat resolves */
  result?: AtBatResult;
  resolvedAt?: number; // guard against multiple resolutions
  /**
   * Optional play resolution data (Step 20).
   * Present only for in-play outcomes.
   */
  play?: AtBatPlay;
};
