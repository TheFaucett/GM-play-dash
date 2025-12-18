import type { BattingOutcome } from "./battingTable";

/**
 * Lightweight attribute views used by the sim.
 * These are derived from Player.ratings elsewhere.
 */
export type BatterAttrs = {
  contact: number;     // 0–100
  power: number;       // 0–100
  discipline: number;  // 0–100
};

export type PitcherAttrs = {
  stuff: number;    // 0–100
  control: number;  // 0–100
  movement: number; // 0–100
};

export type PitchIntent =
  | "attack"
  | "paint"
  | "waste"
  | "nibble";

export function applyBattingModifiers(
  base: Record<BattingOutcome, number>,
  batter: BatterAttrs,
  pitcher: PitcherAttrs,
  intent: PitchIntent
): Record<BattingOutcome, number> {
  // Clone so we never mutate the base table
  const table: Record<BattingOutcome, number> = { ...base };

  /* -------------------------------------------------
   * Batter effects
   * ------------------------------------------------- */

  // Contact shifts probability from outs → balls in play
  const contactBoost = (batter.contact - 50) / 250;
  table.out -= contactBoost;
  table.single += contactBoost * 0.7;
  table.double += contactBoost * 0.2;
  table.triple += contactBoost * 0.1;

  // Power converts some contact into HRs
  const powerBoost = (batter.power - 50) / 300;
  table.home_run += powerBoost;
  table.out -= powerBoost * 0.5;

  // Discipline slightly increases walk rate (future-proof)
  const disciplineBoost = (batter.discipline - 50) / 400;
  table.walk += disciplineBoost;
  table.out -= disciplineBoost * 0.5;

  /* -------------------------------------------------
   * Pitcher effects
   * ------------------------------------------------- */

  // Stuff suppresses hits, increases outs
  const stuffFactor = (pitcher.stuff - 50) / 300;
  table.out += stuffFactor;
  table.single -= stuffFactor * 0.6;
  table.double -= stuffFactor * 0.3;

  // Control suppresses walks
  const controlFactor = (pitcher.control - 50) / 400;
  table.walk -= controlFactor;
  table.out += controlFactor * 0.5;

  /* -------------------------------------------------
   * Pitch intent effects
   * ------------------------------------------------- */

  if (intent === "attack") {
    table.home_run += 0.01;
    table.out += 0.01;
  }

  if (intent === "paint" || intent === "nibble") {
    table.walk += 0.02;
    table.out -= 0.01;
  }

  if (intent === "waste") {
    table.walk += 0.03;
    table.out -= 0.02;
  }

  /* -------------------------------------------------
   * Normalize probabilities
   * ------------------------------------------------- */

  const total = Object.values(table).reduce((a, b) => a + b, 0);

  for (const key in table) {
    table[key as BattingOutcome] /= total;
  }

  return table;
}
