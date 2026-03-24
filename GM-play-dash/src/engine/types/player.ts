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


export type PlayerProjection = {
  version: 1;
  asOfYear?: number;

  // convenient for UI
  role: PlayerRole;

  batting?: {
    pa: number; // baseline, e.g. 600
    AB: number;
    H: number;
    "2B": number;
    "3B": number;
    HR: number;
    BB: number;
    SO: number;

    AVG: number;
    OBP: number;
    SLG: number;
    OPS: number;

    BBpct: number; // 0..1
    Kpct: number;  // 0..1
    HRpct: number; // HR / PA
    BABIP: number; // hits-in-play / balls-in-play
  };

  pitching?: {
    ip: number; // baseline, e.g. 180 SP / 60 RP
    BF: number; // batters faced approximation
    H: number;
    BB: number;
    SO: number;
    HR: number;

    ERA: number;
    WHIP: number;
    K9: number;
    BB9: number;
    HR9: number;

    Kpct: number;  // 0..1
    BBpct: number; // 0..1
    HRpct: number; // HR / BF
    BABIP: number; // hits-in-play / balls-in-play
  };
};
/**
 * Declared gameplay role.
 * NOTE:
 * - This is NOT fielding position.
 * - BAT = any non-pitcher.
 */
export type PlayerRole = "SP" | "RP" | "CL" | "BAT";

/* =====================================
   CONTRACTS (PHASE A)
===================================== */

/**
 * Minimal player contract.
 * Stored directly on Player.
 *
 * IMPORTANT:
 * - No derived fields yet
 * - Calendar-based, not tick-based
 */
  export type PlayerContract = {
    yearsRemaining: number;     // years left after this season
    annualSalary: number;       // AAV
    totalValue: number;         // optional but helpful
    signedYear: number;         // when contract started
    type: "prearb" | "arb" | "guaranteed";
  };
  export type PlayerRosterStatus = {
  /** True if player occupies a 40-man roster slot */
  on40: boolean;

  /**
   * Option years remaining (MLB <-> AAA moves).
   * Start simple: 3 for most prospects, 0 for veterans.
   */
  optionYearsRemaining?: number;

  /**
   * Whether an option has been used this season (MLB->AAA).
   * Options are per-year, not per-move.
   */
  optionUsedThisYear?: boolean;

  /**
   * Future hooks (safe to add later):
   * - serviceDays?: number
   * - rule5Eligible?: boolean
   * - waiverEligible?: boolean
   */
  }; 
/* =====================================
   PLAYER VALUE (DERIVED, PHASE A)
===================================== */

/**
 * Cached evaluation of player value.
 *
 * IMPORTANT:
 * - Derived (never authoritative)
 * - Safe to overwrite at any time
 * - Team-agnostic for now (team fit comes later)
 */
export type PlayerValue = {
  /** Overall value score (0–100, relative) */
  overall: number;
  /**
  total value  
  */
  total: number;
  /** Age-based modifier (0–1) */
  ageCurve: number;

  /** Role effectiveness (0–1) */
  roleFit: number;

  /**
   * Version tag so you can safely
   * invalidate/recompute later
   */
  version: 1;
};

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

export type PitchingUsage = {
  lastAppearanceDay?: number;
  lastAppearancePitchCount?: number;
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
   */
  role: PlayerRole;

  /**
   * Contract (optional for rollout safety)
   */
  contract?: PlayerContract;

  /**
   * ✅ Derived player value (PHASE A)
   * - Optional
   * - Cached
   * - Safe to recompute
   */
  value?: PlayerValue;
  roster?: PlayerRosterStatus;
  /**
   * Canonical hidden traits.
   */
  latents?: PlayerLatents;

  /**
   * Pitch arsenal (only for pitchers).
   */
  arsenal?: PitchArsenal;
  projection?: PlayerProjection;
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
    command?: number;
    movement?: number;
    stamina?: number;

    /* Fielding */
    fielding?: number;
    arm?: number;
    speed?: number;
  };

  /* =====================================
     RUNTIME STATE
  ===================================== */

  fatigue: number;
  health: number;

  /**
   * Pitch-specific fatigue (per pitch type).
   * Kept for backward compatibility.
   */
  pitchState?: Record<
    string,
    {
      fatigue: number;
    }
  >;

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
