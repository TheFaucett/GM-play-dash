// engine/sim/generateLatents.ts

import type {
  BatterLatents,
  PitcherLatents,
  CommonLatents,
} from "../types/playerLatents";

/**
 * Keep this file PURE.
 * - No knowledge of Player entities
 * - Only generates latent trait bundles
 */

export type RollFn = () => number;

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Box–Muller normal sampler using an injected roll().
 * Returns a value roughly N(mean, sd).
 */
function normal(mean: number, sd: number, roll: RollFn): number {
  // Avoid 0 to prevent log(0)
  const u1 = clamp(roll(), 1e-12, 1 - 1e-12);
  const u2 = clamp(roll(), 1e-12, 1 - 1e-12);
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * sd;
}

/**
 * Skewed distribution for "lots of average, few elite".
 * Good for sports traits. (logistic-ish)
 */
function talent(mean: number, sd: number, roll: RollFn): number {
  // Blend normal + slight positive skew
  const n = normal(mean, sd, roll);
  const skew = Math.pow(roll(), 2) * sd * 0.6; // small upward tail
  return n + skew;
}

function toLatent(n: number) {
  return clamp(n, 0, 100);
}

/**
 * Generates mental + physical global traits.
 * These should be the "shared backbone" for BOTH batters/pitchers.
 */
export function generateCommonLatents(roll: RollFn): CommonLatents {
  const athleticism = toLatent(talent(50, 14, roll));
  const consistency = toLatent(talent(50, 12, roll));

  // Volatility tends to be inversely related to consistency
  const volatility = toLatent(
    normal(55 - (consistency - 50) * 0.35, 14, roll)
  );

  // ConfidenceSlope: how much results snowball.
  // Tends to be higher for volatile players.
  const confidenceSlope = toLatent(
    normal(50 + (volatility - 50) * 0.25, 10, roll)
  );

  // PressureSensitivity: how much they shrink in big moments.
  // Slightly worse for volatile players, slightly better for consistent ones.
  const pressureSensitivity = toLatent(
    normal(52 + (volatility - 50) * 0.25 - (consistency - 50) * 0.2, 12, roll)
  );

  return {
    athleticism,
    consistency,
    volatility,
    confidenceSlope,
    pressureSensitivity,
  };
}

/* ============================================
   BATTER LATENTS
============================================ */

export function generateBatterLatents(roll: RollFn): BatterLatents {
  const common = generateCommonLatents(roll);

  const { athleticism, consistency, volatility } = common;

  // Hand-eye correlates with athleticism + consistency a bit
  const handEye = toLatent(
    normal(45 + (athleticism - 50) * 0.45 + (consistency - 50) * 0.25, 12, roll)
  );

  // Bat speed correlates strongly with athleticism
  const batSpeed = toLatent(
    normal(45 + (athleticism - 50) * 0.65, 13, roll)
  );

  // Plate vision correlates with consistency; harmed slightly by volatility
  const plateVision = toLatent(
    normal(48 + (consistency - 50) * 0.6 - (volatility - 50) * 0.15, 12, roll)
  );

  // Aggression correlates with volatility; mild inverse with plate vision
  const aggression = toLatent(
    normal(52 + (volatility - 50) * 0.45 - (plateVision - 50) * 0.2, 14, roll)
  );

  // Lift bias: independent-ish but bat speed nudges upward slightly
  const liftBias = toLatent(normal(50 + (batSpeed - 50) * 0.2, 16, roll));

  // Pull bias: mostly style, moderate spread
  const pullBias = toLatent(normal(50, 16, roll));

  return {
    ...common,
    handEye,
    batSpeed,
    plateVision,
    aggression,
    liftBias,
    pullBias,
  };
}

/* ============================================
   PITCHER LATENTS
============================================ */

export function generatePitcherLatents(roll: RollFn): PitcherLatents {
  const common = generateCommonLatents(roll);

  const { athleticism, consistency, volatility } = common;

  // Arm strength correlates with athleticism strongly
  const armStrength = toLatent(
    normal(48 + (athleticism - 50) * 0.7, 14, roll)
  );

  // Release consistency correlates with consistency, harmed by volatility
  const releaseConsistency = toLatent(
    normal(48 + (consistency - 50) * 0.65 - (volatility - 50) * 0.25, 13, roll)
  );

  // Movement ability correlates with athleticism + some randomness
  const movementAbility = toLatent(
    normal(46 + (athleticism - 50) * 0.45, 14, roll)
  );

  // Command focus correlates with consistency, inverse with volatility
  const commandFocus = toLatent(
    normal(50 + (consistency - 50) * 0.45 - (volatility - 50) * 0.35, 12, roll)
  );

  // Risk tolerance correlates with volatility; inverse with command focus
  const riskTolerance = toLatent(
    normal(52 + (volatility - 50) * 0.55 - (commandFocus - 50) * 0.2, 14, roll)
  );

  // Fatigue resistance correlates with athleticism + consistency
  const fatigueResistance = toLatent(
    normal(48 + (athleticism - 50) * 0.35 + (consistency - 50) * 0.35, 12, roll)
  );

  return {
    ...common,
    armStrength,
    releaseConsistency,
    movementAbility,
    commandFocus,
    riskTolerance,
    fatigueResistance,
  };
}
