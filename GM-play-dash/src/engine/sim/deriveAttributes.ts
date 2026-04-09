// src/engine/sim/deriveAttributes.ts
// --------------------------------------------------
// LAYER 1 + LAYER 2 ATTRIBUTE DERIVATION
// ❗ Leaf module — MUST NOT import from higher layers
// --------------------------------------------------

import type { Player } from "../types/player";
import type {
  BatterArchetype,
  PitcherArchetype,
} from "../types/playerArchetypes";

import type {
  PlayerLatents,
  BatterLatents,
  PitcherLatents,
} from "../types/playerLatents";

/* ==============================================
   CONSTANTS / HELPERS
============================================== */

const DEFAULT_RATING = 50;

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Noise helper.
 *
 * IMPORTANT:
 * - Default is OFF to keep UI/projections deterministic & stable.
 * - If enabled, uses Math.random() (non-deterministic). Later you can swap
 *   this to a seeded roll if you want deterministic sim noise.
 */
function noise(scale = 4, enabled = false): number {
  if (!enabled) return 0;
  return (Math.random() - 0.5) * scale;
}

/** Safe read for optional tendency values */
function t(v: unknown, scale = 1): number {
  return typeof v === "number" ? v * scale : 0;
}

type DeriveOpts = {
  /** Whether to apply random jitter. Default false for stability. */
  noise?: boolean;
  /** Optional noise amplitude. Default 4. */
  noiseScale?: number;
};

function batterDefaults() {
  return {
    contact: DEFAULT_RATING,
    power: DEFAULT_RATING,
    discipline: DEFAULT_RATING,
    vision: DEFAULT_RATING,
  };
}

function pitcherDefaults() {
  return {
    stuff: DEFAULT_RATING,
    control: DEFAULT_RATING,
    movement: DEFAULT_RATING,
    stamina: DEFAULT_RATING,
  };
}

/* ==============================================
   BATTER ATTRIBUTES (Layer 1 + Layer 2)
============================================== */

export function getBatterAttributes(player: Player, opts: DeriveOpts = {}) {
  /**
   * ✅ ROLE GUARD
   * Prevents pitchers/closers from being evaluated as batters
   * even if legacy data accidentally includes batter latents/archetype.
   */
  if (player.role !== "BAT") {
    return batterDefaults();
  }

  const r = player.ratings;

  const latents = player.latents as PlayerLatents | undefined;
  const common = latents?.common;
  const batter = latents?.batter as BatterLatents | undefined;

  const archetype: BatterArchetype | undefined = r.batterArchetype;

  // 🔹 Layer 2: tendencies (optional, soft)
  const tendencies = (player as any)?.tendencies?.batter ?? {};

  const useNoise = opts.noise ?? false;
  const noiseScale = opts.noiseScale ?? 4;

  /* ---------- Base derivation (Layer 1) ---------- */

  let contact =
    batter && common
      ? batter.handEye * 0.6 +
        batter.plateVision * 0.3 +
        common.consistency * 0.1 +
        noise(noiseScale, useNoise)
      : (r.contact ?? DEFAULT_RATING);

  let power =
    batter && common
      ? batter.batSpeed * 0.7 +
        batter.liftBias * 0.2 +
        common.athleticism * 0.1 +
        noise(noiseScale, useNoise)
      : (r.power ?? DEFAULT_RATING);

  let discipline =
    batter && common
      ? batter.plateVision * 0.6 +
        (100 - batter.aggression) * 0.25 +
        common.consistency * 0.15 +
        noise(noiseScale, useNoise)
      : (r.discipline ?? DEFAULT_RATING);

  let vision =
    batter && common
      ? batter.plateVision * 0.7 +
        common.consistency * 0.3 +
        noise(noiseScale, useNoise)
      : (r.vision ?? DEFAULT_RATING);

  /* ---------- Layer 2: tendency bias ---------- */

  power += t(tendencies.pullHappy, 0.12);
  power += t(tendencies.huntsFastball, 0.10);

  discipline += t(tendencies.takesFirstPitch, 0.18);
  discipline -= t(tendencies.sellOutPower, 0.20);

  contact += t(tendencies.twoStrikeProtect, 0.15);
  power -= t(tendencies.twoStrikeProtect, 0.12);

  /* ---------- Archetype flavor ---------- */

  switch (archetype) {
    case "contact_hitter":
      contact += 15;
      discipline += 8;
      vision += 6;
      power -= 10;
      break;

    case "three_true_outcomes":
      power += 16;
      discipline += 12;
      contact -= 14;
      vision -= 6;
      break;

    case "speedy":
      contact += 10;
      vision += 8;
      discipline += 4;
      power -= 16;
      break;

    case "power_slugger":
      power += 20;
      contact -= 10;
      discipline -= 6;
      vision -= 8;
      break;

    default:
      break;
  }

  return {
    contact: clamp(contact),
    power: clamp(power),
    discipline: clamp(discipline),
    vision: clamp(vision),
  };
}

/* ==============================================
   PITCHER ATTRIBUTES (Layer 1 + Layer 2)
============================================== */

export function getPitcherAttributes(player: Player, opts: DeriveOpts = {}) {
  /**
   * ✅ ROLE GUARD
   * Prevents hitters from being evaluated as pitchers
   * even if legacy data accidentally includes pitcher latents/archetype.
   */
  if (player.role === "BAT") {
    return pitcherDefaults();
  }

  const r = player.ratings;

  const latents = player.latents as PlayerLatents | undefined;
  const common = latents?.common;
  const pitcher = latents?.pitcher as PitcherLatents | undefined;

  const archetype: PitcherArchetype | undefined = r.pitcherArchetype;

  // 🔹 Layer 2: tendencies (optional, soft)
  const tendencies = (player as any)?.tendencies?.pitcher ?? {};

  const useNoise = opts.noise ?? false;
  const noiseScale = opts.noiseScale ?? 4;

  /* ---------- Base derivation (Layer 1) ---------- */

  let stuff =
    pitcher && common
      ? pitcher.armStrength * 0.6 +
        pitcher.movementAbility * 0.25 +
        common.athleticism * 0.15 +
        noise(noiseScale, useNoise)
      : (r.stuff ?? DEFAULT_RATING);

  let control =
    pitcher && common
      ? pitcher.releaseConsistency * 0.6 +
        pitcher.commandFocus * 0.25 +
        common.consistency * 0.15 +
        noise(noiseScale, useNoise)
      : (r.command ?? DEFAULT_RATING);

  let movement =
    pitcher
      ? pitcher.movementAbility * 0.75 +
        noise(noiseScale, useNoise)
      : (r.movement ?? DEFAULT_RATING);

  let stamina =
    pitcher && common
      ? pitcher.fatigueResistance * 0.7 +
        common.consistency * 0.3 +
        noise(noiseScale, useNoise)
      : (r.stamina ?? DEFAULT_RATING);

  /* ---------- Layer 2: tendency bias ---------- */

  control += t(tendencies.pitchToContact, 0.20);
  movement += t(tendencies.chaseHeavy, 0.18);

  stuff += t(tendencies.fastballBias, 0.14);
  control -= t(tendencies.fastballBias, 0.10);

  control += t(tendencies.firstPitchStrikeBias, 0.16);

  /* ---------- Archetype flavor ---------- */

  switch (archetype) {
    case "power_ace":
      stuff += 20;
      stamina += 8;
      control -= 6;
      movement -= 4;
      break;

    case "control_artist":
      control += 18;
      movement += 6;
      stuff -= 10;
      stamina += 4;
      break;

    case "soft_toss_lefty":
      movement += 16;
      control += 6;
      stuff -= 18;
      stamina += 6;
      break;

    case "groundball_specialist":
      movement += 20;
      control += 6;
      stuff -= 12;
      break;

    case "wild_fireballer":
      stuff += 22;
      movement += 6;
      control -= 18;
      stamina -= 4;
      break;

    default:
      break;
  }

  return {
    stuff: clamp(stuff),
    control: clamp(control),
    movement: clamp(movement),
    stamina: clamp(stamina),
  };
}

/* ==============================================
   TYPES
============================================== */

export type BatterAttributes = ReturnType<typeof getBatterAttributes>;
export type PitcherAttributes = ReturnType<typeof getPitcherAttributes>;