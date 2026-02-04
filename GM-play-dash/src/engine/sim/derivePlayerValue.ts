import type { Player, PlayerValue } from "../types/player";

/* =====================================
   CONSTANTS
===================================== */

/**
 * Age curve peaks at 27–29.
 * Hard-coded for Phase A (tunable later).
 */
function ageCurve(age: number): number {
  if (age <= 20) return 0.6;
  if (age <= 23) return 0.75;
  if (age <= 26) return 0.9;
  if (age <= 29) return 1.0;
  if (age <= 32) return 0.85;
  if (age <= 35) return 0.7;
  return 0.55;
}

/**
 * Clamp helper
 */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/* =====================================
   ROLE VALUE MODELS
===================================== */

function batterBaseValue(player: Player): number {
  const r = player.ratings;

  return (
    (r.contact ?? 50) * 0.35 +
    (r.power ?? 50) * 0.35 +
    (r.discipline ?? 50) * 0.2 +
    (r.vision ?? 50) * 0.1
  );
}

function pitcherBaseValue(player: Player): number {
  const r = player.ratings;

  return (
    (r.stuff ?? 50) * 0.4 +
    (r.command ?? 50) * 0.3 +
    (r.movement ?? 50) * 0.2 +
    (r.stamina ?? 50) * 0.1
  );
}

/**
 * How well the player fits their declared role.
 * Ignores team context (Phase A).
 */
function roleFit(player: Player): number {
  switch (player.role) {
    case "SP":
      return clamp(
        (player.ratings.stamina ?? 50) / 100,
        0.6,
        1.0
      );

    case "RP":
    case "CL":
      return clamp(
        ((player.ratings.stuff ?? 50) +
          (player.ratings.command ?? 50)) / 200,
        0.6,
        1.0
      );

    case "BAT":
    default:
      return 1.0;
  }
}

/* =====================================
   PUBLIC API
===================================== */

/**
 * Derives a cached PlayerValue snapshot.
 *
 * HARD GUARANTEES:
 * - Pure
 * - Deterministic
 * - No mutation
 * - Safe to overwrite anytime
 *
 * PHASE A NOTE:
 * - `overall` and `total` are intentionally identical
 * - They will diverge in later phases
 */
export function derivePlayerValue(
  player: Player
): PlayerValue {
  const base =
    player.role === "BAT"
      ? batterBaseValue(player)
      : pitcherBaseValue(player);

  const ageFactor = ageCurve(player.age);
  const fit = roleFit(player);

  const overall = clamp(
    base * ageFactor * fit,
    10,
    100
  );

  const roundedOverall = Math.round(overall);

  return {
    overall: roundedOverall,

    // ✅ Phase A: total === overall
    // Later: contracts, scarcity, age windows, etc.
    total: roundedOverall,

    ageCurve: Number(ageFactor.toFixed(2)),
    roleFit: Number(fit.toFixed(2)),
    version: 1,
  };
}
