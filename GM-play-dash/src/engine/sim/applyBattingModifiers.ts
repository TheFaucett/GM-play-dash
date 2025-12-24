import type { BattingOutcome } from "./battingTable";
import type {
  BatterAttributes,
  PitcherAttributes,
} from "./deriveAttributes";

/**
 * Pitch intent influences batter outcomes
 */
export type PitchIntent =
  | "attack"
  | "paint"
  | "waste"
  | "nibble";

/**
 * Applies batter + pitcher + pitch intent modifiers
 * to the base batting outcome table.
 *
 * IMPORTANT:
 * - Accepts ONLY derived attributes
 * - Does not mutate base tables
 * - Always normalizes probabilities
 */
export function applyBattingModifiers(
  base: Record<BattingOutcome, number>,
  batter: BatterAttributes,
  pitcher: PitcherAttributes,
  intent: PitchIntent
): Record<BattingOutcome, number> {
  const table: Record<BattingOutcome, number> = { ...base };

  /* =====================================================
     BATTER EFFECTS
     ===================================================== */

  // Contact shifts outs → balls in play
  const contactBoost = (batter.contact - 50) / 250;
  table.out -= contactBoost;
  table.single += contactBoost * 0.7;
  table.double += contactBoost * 0.2;
  table.triple += contactBoost * 0.1;

  // Power converts some contact into HRs
  const powerBoost = (batter.power - 50) / 300;
  table.home_run += powerBoost;
  table.out -= powerBoost * 0.5;

  // Discipline nudges walk rate (esp. nibble/paint)
  const disciplineBoost = (batter.discipline - 50) / 400;
  table.walk += disciplineBoost;
  table.out -= disciplineBoost * 0.5;

  /* =====================================================
     PITCHER EFFECTS
     ===================================================== */

  // Stuff suppresses hits, increases outs
  const stuffFactor = (pitcher.stuff - 50) / 300;
  table.out += stuffFactor;
  table.single -= stuffFactor * 0.6;
  table.double -= stuffFactor * 0.3;

  // Control suppresses walks
  const controlFactor = (pitcher.control - 50) / 400;
  table.walk -= controlFactor;
  table.out += controlFactor * 0.5;

  /* =====================================================
     PITCH INTENT EFFECTS
     ===================================================== */

  switch (intent) {
    case "attack":
      table.home_run += 0.01;
      table.out += 0.01;
      break;

    case "paint":
    case "nibble":
      table.walk += 0.02;
      table.out -= 0.01;
      break;

    case "waste":
      table.walk += 0.03;
      table.out -= 0.02;
      break;
  }

  /* =====================================================
     NORMALIZATION
     ===================================================== */

  const total = Object.values(table).reduce(
    (sum, v) => sum + v,
    0
  );

  for (const key in table) {
    table[key as BattingOutcome] /= total;
  }

  return table;
}
