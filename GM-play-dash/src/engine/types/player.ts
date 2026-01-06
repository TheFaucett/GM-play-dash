// src/engine/types/player.ts

import type { BaseEntity, EntityId } from "./base";
import type {
  BatterArchetype,
  PitcherArchetype,
} from "./playerArchetypes";
import type { PitchArsenal } from "./pitchArsenal";

/* =====================================
   CORE ENUMS
===================================== */

export type Handedness = "R" | "L" | "S";

/**
 * Declared gameplay role.
 * NOTE:
 * - This is NOT fielding position.
 * - BAT = any non-pitcher.
 */
export type PlayerRole = "SP" | "RP" | "CL" | "BAT";

/* =====================================
   LATENT TRAITS (CANONICAL, HIDDEN)
===================================== */

export type CommonLatents = {
  athleticism: number;
  consistency: number;
  volatility: number;
  confidenceSlope: number;
  pressureSensitivity: number;
};

export type BatterLatents = {
  handEye: number;
  batSpeed: number;
  plateVision: number;
  aggression: number;
  liftBias: number;
  pullBias: number;
};

export type PitcherLatents = {
  armStrength: number;
  releaseConsistency: number;
  movementAbility: number;
  commandFocus: number;
  riskTolerance: number;
  fatigueResistance: number;
};

/**
 * Canonical latent composition.
 * Enables two-way players later.
 */
export type PlayerLatents = {
  common: CommonLatents;
  batter?: BatterLatents;
  pitcher?: PitcherLatents;
};

/* =====================================
   PITCHING WORKLOAD (RUNTIME ONLY)
===================================== */

/**
 * Tracks recent pitching usage.
 * Used for recovery, availability, AI decisions.
 */
export type PitchingUsage = {
  /** Last day this pitcher appeared */
  lastAppearanceDay?: number;

  /** Total pitches thrown in that appearance */
  lastAppearancePitchCount?: number;

  /** Consecutive days pitched (relievers) */
  consecutiveDaysPitched?: number;
};

/* =====================================
   PLAYER ENTITY
===================================== */

export type Player = BaseEntity & {
  id: EntityId;

  name: string;
  age: number;
  handedness: Handedness;

  /** Current assignment */
  teamId: EntityId;
  level: "MLB" | "AAA" | "AA" | "A" | "R";

  /**
   * Declared gameplay role.
   * Can change over time.
   */
  role: PlayerRole;

  /**
   * Canonical hidden traits.
   */
  latents?: PlayerLatents;

  /**
   * Pitch arsenal (only for pitchers).
   */
  arsenal?: PitchArsenal;

  /**
   * Visible / scouted ratings.
   */
  ratings: {
    batterArchetype?: BatterArchetype;
    pitcherArchetype?: PitcherArchetype;

    /* Batting */
    contact?: number;
    power?: number;
    discipline?: number;
    vision?: number;

    /* Pitching */
    stuff?: number;
    command?: number; // legacy control
    movement?: number;
    stamina?: number;

    /* Fielding (coarse) */
    fielding?: number;
    arm?: number;
    speed?: number;
  };

  /* =====================================
     RUNTIME STATE
  ===================================== */

  /** General fatigue (0–100) */
  fatigue: number;

  /** Health / injury abstraction */
  health: number;

  /**
   * Pitch-specific fatigue.
   * Keyed by pitch type (FF, SL, CU, etc).
   */
  pitchState?: Record<
    string,
    {
      fatigue: number;
    }
  >;

  /**
   * Recent workload memory (runtime only).
   */
  pitchingUsage?: PitchingUsage;

  /* =====================================
     HISTORY (APPEND-ONLY)
  ===================================== */

  history: {
    injuries: InjuryRecord[];
    transactions: EntityId[];
  };
};

/* =====================================
   INJURIES
===================================== */

export type InjuryRecord = {
  type: string;
  startDay: number;
  endDay?: number;
};
