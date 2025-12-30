import type { ContactQuality } from "./contactQuality";
import type { PitchType, PitchLocation } from "../types/pitch";

/**
 * Resolve contact quality based on:
 * - Batter power
 * - Pitch type
 * - Location
 *
 * Returns: "weak" | "solid" | "crushed"
 */
export function resolveContactQuality(
  power: number,           // 0–100
  pitchType: PitchType,
  location: PitchLocation,
  rng: () => number
): ContactQuality {
  // -------------------------------------------------
  // BASELINE (power-driven)
  // -------------------------------------------------
  let crushedChance = 0.04 + power / 350; // ~4% → ~32%
  let solidChance = 0.32 + power / 220;   // ~32% → ~77%

  // -------------------------------------------------
  // LOCATION MODIFIERS
  // -------------------------------------------------
  if (location === "middle") {
    crushedChance += 0.06;
    solidChance += 0.06;
  }

  if (location === "high") {
    crushedChance -= 0.04;
    solidChance -= 0.02;
  }

  if (location === "low") {
    solidChance -= 0.03;
  }

  // -------------------------------------------------
  // PITCH TYPE MODIFIERS
  // (affect quality, not outcome directly)
  // -------------------------------------------------
  switch (pitchType) {
    // ---- FASTBALL FAMILY ----
    case "FF": // four-seam
      crushedChance += 0.05;
      solidChance += 0.02;
      break;

    case "SI": // sinker
      crushedChance -= 0.04;
      solidChance -= 0.02;
      break;

    case "CT": // cutter
      crushedChance -= 0.02;
      solidChance -= 0.01;
      break;

    // ---- BREAKING BALLS ----
    case "SL": // slider
      crushedChance -= 0.05;
      solidChance -= 0.03;
      break;

    case "SW": // sweeper
      crushedChance -= 0.06;
      solidChance -= 0.04;
      break;

    case "CU": // curveball
      crushedChance -= 0.07;
      solidChance -= 0.05;
      break;

    case "KB": // knuckle curve
      crushedChance -= 0.08;
      solidChance -= 0.06;
      break;

    // ---- OFFSPEED ----
    case "CH": // changeup
      crushedChance -= 0.03;
      solidChance += 0.02;
      break;

    case "SF": // splitter
      crushedChance -= 0.06;
      solidChance -= 0.04;
      break;
  }

  // -------------------------------------------------
  // SAFETY CLAMPS
  // -------------------------------------------------
  crushedChance = Math.max(0.01, Math.min(crushedChance, 0.40));
  solidChance = Math.max(0.10, Math.min(solidChance, 0.80));

  // Prevent overflow
  if (crushedChance + solidChance > 0.95) {
    solidChance = 0.95 - crushedChance;
  }

  // -------------------------------------------------
  // ROLL
  // -------------------------------------------------
  const roll = rng();

  if (roll < crushedChance) return "crushed";
  if (roll < crushedChance + solidChance) return "solid";
  return "weak";
}

export const __runtime = true;
// DONT IGNORE ME!
