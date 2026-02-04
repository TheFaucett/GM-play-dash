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

function randNormal(
  roll: RollFn,
  mean = 50,
  sd = 12
): number {
  const u = roll() || 1e-6;
  const v = roll() || 1e-6;
  const z =
    Math.sqrt(-2 * Math.log(u)) *
    Math.cos(2 * Math.PI * v);
  return clamp01to100(mean + z * sd);
}

/* ==============================================
   LATENT GENERATORS
============================================== */

function generateCommonLatents(roll: RollFn): CommonLatents {
  return {
    athleticism: randNormal(roll, 50, 12),
    consistency: randNormal(roll, 50, 10),
    volatility: randNormal(roll, 50, 15),
    confidenceSlope: randNormal(roll, 50, 10),
    pressureSensitivity: randNormal(roll, 50, 10),
  };
}

function generateBatterLatents(roll: RollFn): BatterLatents {
  return {
    handEye: randNormal(roll, 50, 12),
    batSpeed: randNormal(roll, 50, 14),
    plateVision: randNormal(roll, 50, 12),
    aggression: randNormal(roll, 50, 15),
    liftBias: randNormal(roll, 50, 20),
    pullBias: randNormal(roll, 50, 15),
  };
}

function generatePitcherLatents(roll: RollFn): PitcherLatents {
  return {
    armStrength: randNormal(roll, 50, 14),
    releaseConsistency: randNormal(roll, 50, 12),
    movementAbility: randNormal(roll, 50, 12),
    commandFocus: randNormal(roll, 50, 10),
    riskTolerance: randNormal(roll, 50, 15),
    fatigueResistance: randNormal(roll, 50, 12),
  };
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

  const seed =
    typeof args.seed === "number"
      ? args.seed
      : Math.random();

  const roll = makeRoll(seed);

  /* --------------------------------------------
     NAME (REAL, DETERMINISTIC)
  -------------------------------------------- */

  const generatedName = generatePlayerName(seed);

  /* --------------------------------------------
     LATENT LAYERS
  -------------------------------------------- */

  const common = generateCommonLatents(roll);
  const batter = generateBatterLatents(roll);
  const pitcher = generatePitcherLatents(roll);

  /* --------------------------------------------
     PROFILE / ARCHETYPE
  -------------------------------------------- */

  const profile = assignPlayerProfile({
    common,
    batter,
    pitcher,
  });

  const latents: Player["latents"] =
    profile.kind === "batter"
      ? { common, batter }
      : { common, pitcher };

  /* --------------------------------------------
     FIELDING (FUTURE SYSTEM)
  -------------------------------------------- */

  assignFieldingPositions(latents);

  const fieldingRating =
    common.athleticism * 0.6 +
    (batter?.handEye ?? 50) * 0.2 +
    (batter?.plateVision ?? 50) * 0.2;

  const armRating =
    pitcher?.armStrength ?? common.athleticism;

  const speedRating =
    common.athleticism;

  /* --------------------------------------------
     HANDEDNESS
  -------------------------------------------- */

  const handedness: Handedness =
    args.handedness ??
    (roll() < 0.1
      ? "S"
      : roll() < 0.55
      ? "R"
      : "L");

  /* --------------------------------------------
     ROLE
  -------------------------------------------- */

  const role: PlayerRole =
    args.role ??
    (profile.kind === "pitcher" ? "SP" : "BAT");

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
      batterArchetype: profile.batterArchetype,
      pitcherArchetype: profile.pitcherArchetype,
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
