// src/engine/sim/generatePlayer.ts

import type { Player, Handedness, PlayerRole } from "../types/player";
import type {
  CommonLatents,
  BatterLatents,
  PitcherLatents,
} from "../types/playerLatents";

import { assignPlayerProfile } from "./assignPlayerProfile";
import { assignFieldingPositions } from "./assignFieldingPositions";
import { generatePlayerName } from "./generatePlayerNames";

/* ==============================================
   RNG
============================================== */

export type RollFn = () => number;

function makeRoll(seed = Math.random()): RollFn {
  let x = Math.floor(seed * 1e9);
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function randNormal(roll: RollFn, mean = 50, sd = 12): number {
  const u = roll() || 1e-6;
  const v = roll() || 1e-6;
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return clamp01to100(mean + z * sd);
}

/**
 * Adds controlled “holes” / spikes:
 * - With some probability, heavily penalize or boost a latent.
 * - Produces more interesting players (one carrying tool, one fatal flaw).
 */
function applyHolesAndSpikes<T extends Record<string, number>>(
  roll: RollFn,
  base: T,
  opts: {
    // chance a player has an extreme weakness in one dimension
    holeChance: number; // e.g. 0.22
    // chance a player has one standout tool
    spikeChance: number; // e.g. 0.18
    // how big the hole is (subtract)
    holeMagnitude: [number, number]; // e.g. [18, 38]
    // how big the spike is (add)
    spikeMagnitude: [number, number]; // e.g. [12, 28]
    // optionally exclude keys from being modified
    exclude?: string[];
  }
): T {
  const keys = Object.keys(base).filter(
    (k) => !opts.exclude?.includes(k)
  ) as (keyof T)[];

  // 1) Hole (one big weakness)
  if (keys.length > 0 && roll() < opts.holeChance) {
    const k = keys[Math.floor(roll() * keys.length)];
    const mag =
      opts.holeMagnitude[0] +
      roll() * (opts.holeMagnitude[1] - opts.holeMagnitude[0]);

    // Penalty can be inverted for “lower is better” stats (aggression-ish),
    // but we keep it simple: holes are true weaknesses (lower number).
    base[k] = clamp01to100(base[k] - mag) as any;
  }

  // 2) Spike (one big tool)
  if (keys.length > 0 && roll() < opts.spikeChance) {
    const k = keys[Math.floor(roll() * keys.length)];
    const mag =
      opts.spikeMagnitude[0] +
      roll() * (opts.spikeMagnitude[1] - opts.spikeMagnitude[0]);
    base[k] = clamp01to100(base[k] + mag) as any;
  }

  return base;
}

/* ==============================================
   LATENT GENERATORS
============================================== */

function generateCommonLatents(roll: RollFn): CommonLatents {
  // Slightly wider on athleticism/volatility to avoid “everyone ~50”
  const base: CommonLatents = {
    athleticism: randNormal(roll, 50, 14),
    consistency: randNormal(roll, 50, 11),
    volatility: randNormal(roll, 50, 18),
    confidenceSlope: randNormal(roll, 50, 12),
    pressureSensitivity: randNormal(roll, 50, 12),
  };

  // More variety: common holes/spikes make extreme athletes / mental cases.
  return applyHolesAndSpikes(roll, base, {
    holeChance: 0.16,
    spikeChance: 0.14,
    holeMagnitude: [14, 30],
    spikeMagnitude: [10, 22],
  });
}

function generateBatterLatents(roll: RollFn): BatterLatents {
  // Widen power-driving traits a bit (batSpeed, liftBias)
  const base: BatterLatents = {
    handEye: randNormal(roll, 50, 13),
    batSpeed: randNormal(roll, 50, 16),
    plateVision: randNormal(roll, 50, 13),
    aggression: randNormal(roll, 50, 16),
    liftBias: randNormal(roll, 50, 22),
    pullBias: randNormal(roll, 50, 16),
  };

  // Encourage “super bad hole” profiles:
  // - Some guys can’t see pitches (plateVision hole)
  // - Some have no bat speed / no hand-eye
  // - Some are all-or-nothing lift merchants
  return applyHolesAndSpikes(roll, base, {
    holeChance: 0.26,
    spikeChance: 0.22,
    holeMagnitude: [18, 42],
    spikeMagnitude: [12, 30],
    // aggression can be weird to “hole” because low aggression increases discipline;
    // still fine, but you can exclude if you want.
    exclude: [],
  });
}

function generatePitcherLatents(roll: RollFn): PitcherLatents {
  // Widen core pitching traits so pitcher projections don’t cluster at 4.20.
  const base: PitcherLatents = {
    armStrength: randNormal(roll, 50, 18),
    releaseConsistency: randNormal(roll, 50, 14),
    movementAbility: randNormal(roll, 50, 15),
    commandFocus: randNormal(roll, 50, 13),
    riskTolerance: randNormal(roll, 50, 17),
    fatigueResistance: randNormal(roll, 50, 14),
  };

  // Pitchers should have more extremes:
  // - some true gas with no command
  // - some command artists with no velo
  // - some movement monsters
  return applyHolesAndSpikes(roll, base, {
    holeChance: 0.24,
    spikeChance: 0.22,
    holeMagnitude: [16, 40],
    spikeMagnitude: [12, 30],
    exclude: [],
  });
}

/* ==============================================
   PLAYER GENERATION
============================================== */

export function generatePlayer(args: {
  id: string;
  name?: string;
  age: number;
  teamId: string;
  level: Player["level"];
  role?: PlayerRole;
  handedness?: Handedness;
  seed?: number;
}): Player {
  const now = Date.now();

  const seed = typeof args.seed === "number" ? args.seed : Math.random();
  const roll = makeRoll(seed);

  /* --------------------------------------------
     NAME (REAL, DETERMINISTIC)
  -------------------------------------------- */

  const generatedName = generatePlayerName(seed);

  /* --------------------------------------------
     HANDEDNESS
  -------------------------------------------- */

  const handedness: Handedness =
    args.handedness ??
    (roll() < 0.1 ? "S" : roll() < 0.55 ? "R" : "L");

  /* --------------------------------------------
     ROLE (AUTHORITATIVE)
     - Stop letting profile classification override intended role.
  -------------------------------------------- */

  const role: PlayerRole = args.role ?? "BAT";
  const isPitcher = role === "SP" || role === "RP" || role === "CL";

  /* --------------------------------------------
     LATENT LAYERS (ROLE-GATED)
     - This prevents "closer shows as catcher" bugs.
     - Two-way players can be added later by explicitly generating both.
  -------------------------------------------- */

  const common = generateCommonLatents(roll);

  const batter: BatterLatents | undefined = isPitcher
    ? undefined
    : generateBatterLatents(roll);

  const pitcher: PitcherLatents | undefined = isPitcher
    ? generatePitcherLatents(roll)
    : undefined;

  /* --------------------------------------------
     PROFILE / ARCHETYPE (ROLE-GATED)
     - We still let assignPlayerProfile give flavor,
       but it must not flip the player's identity.
  -------------------------------------------- */

  const profile = assignPlayerProfile({
    common,
    batter,
    pitcher,
  });

  // Canonical latent composition: strictly by role for now
  const latents: Player["latents"] = isPitcher
    ? { common, pitcher }
    : { common, batter };

  /* --------------------------------------------
     FIELDING (FUTURE SYSTEM)
  -------------------------------------------- */

  assignFieldingPositions(latents);

  // Fielding proxies: for pitchers, deprioritize batter latents (they don't exist)
  const fieldingRating =
    common.athleticism * 0.7 +
    (batter?.handEye ?? 45) * 0.15 +
    (batter?.plateVision ?? 45) * 0.15;

  const armRating = pitcher?.armStrength ?? common.athleticism;
  const speedRating = common.athleticism;

  /* --------------------------------------------
     FINAL PLAYER OBJECT
  -------------------------------------------- */

  return {
    id: args.id,
    createdAt: now,
    updatedAt: now,

    // ✅ REAL HUMAN NAME
    name: args.name ?? generatedName.full,

    age: args.age,
    handedness,

    teamId: args.teamId,
    level: args.level,
    role,

    latents,

    ratings: {
      // 🔒 Hard lock archetypes by role (prevents "balanced catcher" on closers)
      batterArchetype: isPitcher ? undefined : profile.batterArchetype,
      pitcherArchetype: isPitcher ? profile.pitcherArchetype : undefined,

      fielding: clamp01to100(fieldingRating),
      arm: clamp01to100(armRating),
      speed: clamp01to100(speedRating),
    },

    fatigue: 0,
    health: 100,

    history: {
      injuries: [],
      transactions: [],
    },
  };
}