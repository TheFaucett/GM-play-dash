import type { BattingOutcome } from "./battingTable";
import type {
  BatterAttributes,
  PitcherAttributes,
} from "./deriveAttributes";
import type { PitchType, PitchLocation } from "../types/pitch";

/**
 * Pitch intent influences batter outcomes
 */
export type PitchIntent =
  | "attack"
  | "paint"
  | "waste"
  | "nibble";

/**
 * Minimal pitch memory used ONLY for sequencing penalties
 */
type PitchMemory = {
  pitchType: PitchType;
  location: PitchLocation;
};

/* =====================================================
   SEQUENCING PENALTY (INLINE HELPER)
   -----------------------------------------------------
   Philosophy:
   - Never reward good sequencing
   - Only punish repetition
   - Convert outs → damage
   - Scale gently, compound naturally
===================================================== */

function applySequencingPenalty(
  base: Record<BattingOutcome, number>,
  memory?: PitchMemory[]
): Record<BattingOutcome, number> {
  if (!memory || memory.length < 2) return base;

  const table: Record<BattingOutcome, number> = { ...base };

  const last = memory[memory.length - 1];
  const prev = memory[memory.length - 2];

  let penalty = 0;

  // Same pitch twice
  if (last.pitchType === prev.pitchType) {
    penalty += 0.03;
  }

  // Same pitch + same location
  if (
    last.pitchType === prev.pitchType &&
    last.location === prev.location
  ) {
    penalty += 0.04;
  }

  if (penalty <= 0) return table;

  // Convert outs into damage
  table.out -= penalty;
  table.single += penalty * 0.6;
  table.double += penalty * 0.25;
  table.home_run += penalty * 0.15;

  return table;
}

/* =====================================================
   APPLY BATTING MODIFIERS
===================================================== */

/**
 * Applies batter + pitcher + pitch intent modifiers
 * to the base batting outcome table.
 *
 * IMPORTANT:
 * - Accepts ONLY derived attributes
 * - Does not mutate base tables
 * - Punishes predictability, never rewards sequencing
 * - Always normalizes probabilities
 */
export function applyBattingModifiers(
  base: Record<BattingOutcome, number>,
  batter: BatterAttributes,
  pitcher: PitcherAttributes,
  intent: PitchIntent,
  pitchMemory?: PitchMemory[] // 👈 optional, engine-safe
): Record<BattingOutcome, number> {
  let table: Record<BattingOutcome, number> = { ...base };

  /* =====================================================
     SEQUENCING PENALTY (FIRST)
     ===================================================== */

  table = applySequencingPenalty(table, pitchMemory);

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
