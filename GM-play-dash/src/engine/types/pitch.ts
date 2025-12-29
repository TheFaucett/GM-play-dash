import type { BaseEntity, EntityId } from "./base";

/** What the pitcher is trying to do */
export type PitchIntent = "attack" | "paint" | "waste" | "nibble";

/** What pitch is thrown */
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

/**
 * Legacy / abstract vertical band.
 * This is kept for:
 * - announcer text
 * - quick UI summaries
 * - backwards compatibility
 */
export type PitchLocation = "high" | "middle" | "low";

/**
 * Normalized strike zone coordinates.
 * (0,0) = bottom-left of zone
 * (1,1) = top-right of zone
 *
 * These are NOT pixels.
 */
export type StrikeZonePoint = {
  x: number; // 0–1 (horizontal)
  y: number; // 0–1 (vertical)
};

/** Result of a single pitch */
export type PitchResult =
  | "ball"
  | "strike"
  | "foul"
  | "in_play";

/**
 * Pitch entity
 */
export type Pitch = BaseEntity & {
  atBatId: EntityId;

  pitchType: PitchType;

  /**
   * High-level intent + descriptive band
   * (used for UI + narration)
   */
  intent: PitchIntent;
  location: PitchLocation;

  /**
   * Where the pitcher AIMED the ball
   * (user click or AI decision)
   */
  target: StrikeZonePoint;

  /**
   * Where the ball ACTUALLY crossed the plate
   * (affected by command, control, volatility, fatigue)
   */
  actual: StrikeZonePoint;

  /**
   * Physical traits
   * (can later vary by pitch type / pitcher)
   */
  velocity: number;
  movement: number;

  /**
   * Final resolved result
   */
  result: PitchResult;
};
