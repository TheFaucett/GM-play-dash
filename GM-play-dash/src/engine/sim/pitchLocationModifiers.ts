import type { PitchOutcome } from "./pitchOutcomeTable";

export function applyPitchLocationModifiers(
  base: Record<PitchOutcome, number>,
  location: "high" | "middle" | "low"
): Record<PitchOutcome, number> {
  const table = { ...base };

  if (location === "low") {
    table.ball += 0.05;
    table.in_play -= 0.02;
  }

  if (location === "high") {
    table.in_play += 0.05;
    table.strike -= 0.03;
  }

  // normalize
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  for (const k in table) {
    table[k as PitchOutcome] /= total;
  }

  return table;
}
