// engine/sim/assignPlayerProfile.ts

import type {
  BatterLatents,
  PitcherLatents,
  PlayerRoleHint,
  CommonLatents,
} from "../types/playerLatents";

import type {
  BatterArchetype,
  PitcherArchetype,
} from "../types/playerArchetypes";

/**
 * PURE: reads latents, outputs "profile decisions".
 * No Player entity mutation in here.
 */

export type PlayerKind = "batter" | "pitcher";

export type PlayerProfile = {
  kind: PlayerKind;
  roleHint?: PlayerRoleHint;

  batterArchetype?: BatterArchetype;
  pitcherArchetype?: PitcherArchetype;
};

/* ============================================
   SCORING HELPERS
============================================ */

function scoreBatter(
  lat: BatterLatents,
  common: CommonLatents
): number {
  const bat =
    lat.handEye * 0.45 +
    lat.batSpeed * 0.35 +
    lat.plateVision * 0.2;

  // volatility lowers reliability
  return bat - (common.volatility - 50) * 0.15;
}

function scorePitcher(
  lat: PitcherLatents,
  common: CommonLatents
): number {
  const pit =
    lat.armStrength * 0.45 +
    lat.releaseConsistency * 0.3 +
    lat.movementAbility * 0.25;

  return pit - (common.volatility - 50) * 0.08;
}

/* ============================================
   KIND DECISION
============================================ */

export function decideKind(args: {
  common: CommonLatents;
  batter?: BatterLatents;
  pitcher?: PitcherLatents;
  bias?: number;
}): PlayerKind {
  const b = args.batter
    ? scoreBatter(args.batter, args.common)
    : 0;

  const p = args.pitcher
    ? scorePitcher(args.pitcher, args.common)
    : 0;

  const bias = args.bias ?? 0;
  return p + bias > b ? "pitcher" : "batter";
}

/* ============================================
   ARCHETYPES
============================================ */

export function assignBatterArchetype(
  lat: BatterLatents,
  common: CommonLatents
): BatterArchetype {
  const contactish =
    lat.handEye * 0.55 +
    lat.plateVision * 0.45;

  const powerish =
    lat.batSpeed * 0.7 +
    lat.liftBias * 0.3;

  const speedyScore =
    common.athleticism * 0.6 +
    (100 - lat.liftBias) * 0.25 +
    lat.plateVision * 0.15;

  const ttoScore =
    powerish * 0.55 +
    lat.aggression * 0.25 +
    common.volatility * 0.15 -
    lat.plateVision * 0.25;

  if (speedyScore >= 70 && powerish < 65) return "speedy";
  if (powerish >= 78 && contactish < 60) return "power_slugger";
  if (ttoScore >= 72 && powerish >= 70) return "three_true_outcomes";
  if (contactish >= 72 && powerish < 70) return "contact_hitter";

  return "balanced";
}

export function assignPitcherArchetype(
  lat: PitcherLatents,
  common: CommonLatents
): PitcherArchetype {
  const stuffish = lat.armStrength * 0.7 + lat.movementAbility * 0.3;
  const controlish =
    lat.releaseConsistency * 0.65 + lat.commandFocus * 0.35;
  const wildness =
    common.volatility * 0.5 + lat.riskTolerance * 0.5;

  if (stuffish >= 80 && controlish >= 60) return "power_ace";
  if (controlish >= 78 && stuffish < 75) return "control_artist";
  if (lat.movementAbility >= 78 && stuffish < 70) return "soft_toss_lefty";
  if (lat.movementAbility >= 80 && controlish >= 60)
    return "groundball_specialist";
  if (stuffish >= 80 && wildness >= 72 && controlish < 58)
    return "wild_fireballer";

  return "control_artist";
}

/* ============================================
   ROLE HINTS
============================================ */

export function assignBatterRoleHint(
  lat: BatterLatents,
  common: CommonLatents
): PlayerRoleHint {
  const ath = common.athleticism;
  const pull = lat.pullBias;
  const lift = lat.liftBias;

  if (ath >= 78) return "CF";
  if (ath >= 65 && pull >= 55 && lift >= 55) return "RF";
  if (ath >= 70 && lift <= 50) return "SS";
  if (ath >= 60) return "2B";
  if (pull >= 60 && lift >= 60) return "3B";
  if (ath <= 48 && lift >= 55) return "1B";
  if (ath <= 45) return "DH";
  return "LF";
}

export function assignPitcherRoleHint(
  lat: PitcherLatents,
  common: CommonLatents
): PlayerRoleHint {
  const starterScore =
    lat.fatigueResistance * 0.55 + common.consistency * 0.45;

  const relieverScore =
    lat.riskTolerance * 0.55 + common.volatility * 0.45;

  if (starterScore >= 68) return "SP";
  if (relieverScore >= 70) return "RP";
  return "RP";
}

/* ============================================
   MAIN ENTRY
============================================ */

export function assignPlayerProfile(args: {
  common: CommonLatents;
  batter?: BatterLatents;
  pitcher?: PitcherLatents;
  kind?: PlayerKind;
}): PlayerProfile {
  const kind =
    args.kind ??
    decideKind({
      common: args.common,
      batter: args.batter,
      pitcher: args.pitcher,
    });

  if (kind === "batter" && args.batter) {
    return {
      kind,
      batterArchetype: assignBatterArchetype(args.batter, args.common),
      roleHint: assignBatterRoleHint(args.batter, args.common),
    };
  }

  if (kind === "pitcher" && args.pitcher) {
    return {
      kind,
      pitcherArchetype: assignPitcherArchetype(args.pitcher, args.common),
      roleHint: assignPitcherRoleHint(args.pitcher, args.common),
    };
  }

  return kind === "batter"
    ? { kind, batterArchetype: "balanced", roleHint: "LF" }
    : { kind, pitcherArchetype: "control_artist", roleHint: "RP" };
}
