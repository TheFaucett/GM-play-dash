import type { PitchOutcome } from "./pitchOutcomeTable";

export function applyPitchTypeModifiers(
  base: Record<PitchOutcome, number>,
  pitchType: "FB" | "SL" | "CB" | "CH"
): Record<PitchOutcome, number> {
  const table = { ...base };

  switch (pitchType) {
    case "FB": // fastball
      table.strike += 0.05;
      table.in_play += 0.03;
      table.foul -= 0.03;
      break;

    case "SL": // slider
      table.foul += 0.05;
      table.in_play -= 0.02;
      break;

    case "CB": // curveball
      table.ball += 0.05;
      table.strike -= 0.02;
      break;

    case "CH": // changeup
      table.in_play += 0.04;
      table.strike -= 0.02;
      break;
  }

  // normalize
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  for (const k in table) {
    table[k as PitchOutcome] /= total;
  }

  return table;
}
