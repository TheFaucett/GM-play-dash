/**
 * HIDDEN, continuous traits.
 * Never shown directly to the user.
 *
 * ALL gameplay attributes are derived from these.
 * This is the single source of truth for player potential.
 */

/* ==============================================
   COMMON LATENTS (SHARED BY ALL PLAYERS)
============================================== */

export type CommonLatents = {
  /** Overall physical coordination & explosiveness */
  athleticism: number;

  /** Mental steadiness & repeatability */
  consistency: number;

  /** Boom/bust tendency (variance of outcomes) */
  volatility: number;

  /** Confidence change after success/failure */
  confidenceSlope: number;

  /** Performance drop in pressure situations */
  pressureSensitivity: number;
};

/* ==============================================
   BATTER LATENTS
============================================== */

export type BatterLatents = {
  /** Hand–eye coordination */
  handEye: number;

  /** Raw swing speed */
  batSpeed: number;

  /** Pitch recognition */
  plateVision: number;

  /** Willingness to swing early / often */
  aggression: number;

  /** Groundball ↔ Flyball tendency */
  liftBias: number;

  /** Pull ↔ Opposite-field tendency */
  pullBias: number;
};

/* ==============================================
   PITCHER LATENTS
============================================== */

export type PitcherLatents = {
  /** Raw arm strength */
  armStrength: number;

  /** Ability to repeat release point */
  releaseConsistency: number;

  /** Ability to generate pitch movement */
  movementAbility: number;

  /** Focus on command vs power */
  commandFocus: number;

  /** Willingness to challenge hitters */
  riskTolerance: number;

  /** Resistance to fatigue accumulation */
  fatigueResistance: number;
};

/* ==============================================
   PLAYER LATENTS (CANONICAL SHAPE)
============================================== */

/**
 * This is what gets stored on Player.latents.
 * Role-specific latents are optional but mutually exclusive in practice.
 */
export type PlayerLatents = {
  common: CommonLatents;
  batter?: BatterLatents;
  pitcher?: PitcherLatents;
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
