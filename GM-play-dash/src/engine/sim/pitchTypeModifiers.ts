import type { PitchOutcome } from "./pitchOutcomeTable";
import type { PitchType } from "../types/pitch";

export function applyPitchTypeModifiers(
  base: Record<PitchOutcome, number>,
  pitchType: PitchType
): Record<PitchOutcome, number> {
  const table = { ...base };

  switch (pitchType) {
    // --------------------
    // FASTBALL FAMILY
    // --------------------
    case "FF": // four-seam
      table.strike += 0.06;
      table.foul += 0.02;
      table.in_play += 0.02;
      table.ball -= 0.03;
      break;

    case "SI": // sinker
      table.in_play += 0.05;
      table.strike -= 0.02;
      table.foul -= 0.01;
      break;

    case "CT": // cutter
      table.foul += 0.04;
      table.in_play += 0.01;
      table.ball -= 0.02;
      break;

    // --------------------
    // BREAKING BALLS
    // --------------------
    case "SL": // slider
      table.foul += 0.06;
      table.in_play -= 0.02;
      table.ball += 0.01;
      break;

    case "SW": // sweeper
      table.foul += 0.07;
      table.ball += 0.03;
      table.in_play -= 0.04;
      break;

    case "CU": // curveball
      table.ball += 0.06;
      table.strike -= 0.02;
      table.foul -= 0.01;
      break;

    case "KB": // knuckle-curve
      table.ball += 0.08;
      table.strike -= 0.03;
      break;

    // --------------------
    // OFFSPEED
    // --------------------
    case "CH": // changeup
      table.in_play += 0.06;
      table.strike -= 0.02;
      table.foul -= 0.02;
      break;

    case "SF": // splitter
      table.in_play += 0.08;
      table.ball += 0.02;
      table.strike -= 0.04;
      break;
  }

  // --------------------
  // Normalize (safe)
  // --------------------
  const total = Object.values(table).reduce((a, b) => a + b, 0);

  for (const key in table) {
    table[key as PitchOutcome] =
      Math.max(0, table[key as PitchOutcome] / total);
  }

  return table;
}
