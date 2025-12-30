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
   These represent the REAL player.
   They change slowly over time.
===================================== */

/**
 * Traits shared by all humans.
 */
export type CommonLatents = {
  /** Speed, agility, coordination */
  athleticism: number;

  /** Mental steadiness & repeatability */
  consistency: number;

  /** Boom/bust tendency */
  volatility: number;

  /** Confidence change after success/failure */
  confidenceSlope: number;

  /** Performance drop in pressure situations */
  pressureSensitivity: number;
};

/**
 * Traits specific to hitting ability.
 */
export type BatterLatents = {
  /** Contact skill */
  handEye: number;

  /** Raw swing speed */
  batSpeed: number;

  /** Pitch recognition */
  plateVision: number;

  /** Swing frequency / aggression */
  aggression: number;

  /** Groundball ↔ Flyball tendency */
  liftBias: number;

  /** Pull ↔ Oppo tendency */
  pullBias: number;
};

/**
 * Traits specific to pitching ability.
 */
export type PitcherLatents = {
  /** Velocity ceiling */
  armStrength: number;

  /** Ability to repeat release */
  releaseConsistency: number;

  /** Raw movement potential */
  movementAbility: number;

  /** Control vs power mindset */
  commandFocus: number;

  /** Willingness to challenge hitters */
  riskTolerance: number;

  /** Stamina & injury resistance */
  fatigueResistance: number;
};

/**
 * 🔑 CANONICAL PLAYER LATENTS
 * Composition, NOT a union.
 *
 * - Every player has `common`
 * - A player may have batter and/or pitcher traits
 * - This allows two-way players later without refactors
 */
export type PlayerLatents = {
  common: CommonLatents;
  batter?: BatterLatents;
  pitcher?: PitcherLatents;
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
   * Can change over time (RP ↔ SP, etc).
   */
  role: PlayerRole;

  /**
   * 🔹 LATENTS (OPTIONAL BUT CANONICAL)
   * - Real underlying traits
   * - Hidden from the user
   * - Used to derive ratings & performance
   */
  latents?: PlayerLatents;
  arsenal?: PitchArsenal;
  /**
   * 🔹 RATINGS (VISIBLE / SCOUTED)
   * - Noisy
   * - Role-biased
   * - May be incomplete or misleading
   * - Backwards compatible forever
   */
  ratings: {
    batterArchetype?: BatterArchetype;
    pitcherArchetype?: PitcherArchetype;

    /* -------- Batting -------- */
    contact?: number;
    power?: number;
    discipline?: number;
    vision?: number;

    /* -------- Pitching -------- */
    stuff?: number;

    /**
     * ⚠️ LEGACY NAME
     * Internally maps to "control".
     * NEVER remove or rename.
     */
    command?: number;

    movement?: number;
    stamina?: number;

    /* -------- Fielding (legacy, coarse) -------- */
    fielding?: number;
    arm?: number;
    speed?: number;
  };

  /* =====================================
     RUNTIME STATE
  ===================================== */

  fatigue: number; // 0–100
  health: number;  // 0–100

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
