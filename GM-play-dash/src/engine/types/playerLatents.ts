// engine/types/playerLatents.ts

/**
 * These are HIDDEN, continuous traits.
 * They are NEVER shown directly to the user.
 * Everything else is DERIVED from these.
 */

export type CommonLatents = {
  /** Overall physical coordination & explosiveness */
  athleticism: number;

  /** Mental steadiness & repeatability */
  consistency: number;

  /** Volatility of outcomes (boom/bust players) */
  volatility: number;

  /** How strongly confidence shifts after success/failure */
  confidenceSlope: number;

  /** How much pressure situations affect performance */
  pressureSensitivity: number;
};

/* ==============================================
   BATTER LATENTS
============================================== */

export type BatterLatents = CommonLatents & {
  /** Hand–eye coordination */
  handEye: number;

  /** Raw swing speed */
  batSpeed: number;

  /** Ability to recognize pitches early */
  plateVision: number;

  /** Willingness to swing (early / often) */
  aggression: number;

  /** Groundball ↔ Flyball bias */
  liftBias: number;

  /** Pull ↔ Oppo tendency */
  pullBias: number;
};

/* ==============================================
   PITCHER LATENTS
============================================== */

export type PitcherLatents = CommonLatents & {
  /** Raw arm strength */
  armStrength: number;

  /** Ability to repeat release point */
  releaseConsistency: number;

  /** Ability to impart movement */
  movementAbility: number;

  /** Mental focus on command vs power */
  commandFocus: number;

  /** Willingness to challenge hitters */
  riskTolerance: number;

  /** Resistance to fatigue accumulation */
  fatigueResistance: number;
};

/* ==============================================
   ROLE HINTS (OPTIONAL, NON-BINDING)
============================================== */

export type PlayerRoleHint =
  | "SP"
  | "RP"
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH";
