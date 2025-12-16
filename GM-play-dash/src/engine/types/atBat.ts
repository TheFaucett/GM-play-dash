import type { BaseEntity, EntityId } from "./base";

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

export type AtBat = BaseEntity & {
  halfInningId: EntityId;

  batterId: EntityId;
  pitcherId: EntityId;

  count: Count;

  pitchIds: EntityId[];

  /** Set only when the at-bat resolves */
  result?: AtBatResult;
};
