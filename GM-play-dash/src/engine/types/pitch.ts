import type { BaseEntity, EntityId } from "./base";

/** What the pitcher is trying to do */
export type PitchIntent = "attack" | "paint" | "waste" | "nibble";

/** What pitch is thrown */
// types/pitch.ts
export type PitchType =
  | "FF" // four-seam
  | "SI" // sinker
  | "CT" // cutter
  | "SL" // slider
  | "SW" // sweeper
  | "CU" // curveball
  | "KB" // knuckle-curve
  | "CH" // changeup
  | "SF"; // split-finger


/** Abstract strike zone target */
export type PitchLocation = "high" | "middle" | "low";

/** Result of a single pitch */
export type PitchResult =
  | "ball"
  | "strike"
  | "foul"
  | "in_play";

export type Pitch = BaseEntity & {
  atBatId: EntityId;

  pitchType: PitchType;
  location: PitchLocation;
  intent: PitchIntent;

  velocity: number;
  movement: number;

  result: PitchResult;
};
