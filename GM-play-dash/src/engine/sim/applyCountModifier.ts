import type { PitchOutcome } from "./pitchOutcomeTable";

export function applyCountModifiers(
  base: Record<PitchOutcome, number>,
  balls: number,
  strikes: number
): Record<PitchOutcome, number> {
  const table = { ...base };

  // 0-2, 1-2 counts → more chase, more foul/strike
  if (strikes === 2) {
    table.foul += 0.05;
    table.in_play -= 0.03;
    table.ball -= 0.02;
  }

  // 3-1, 3-0 counts → more balls, fewer strikes
  if (balls >= 3) {
    table.ball += 0.08;
    table.strike -= 0.04;
    table.foul -= 0.02;
  }

  // normalize
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  for (const k in table) {
    table[k as PitchOutcome] /= total;
  }

  return table;
}
