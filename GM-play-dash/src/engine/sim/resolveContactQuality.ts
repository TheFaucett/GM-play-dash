import type { ContactQuality } from "./contactQuality";
import type { PitchType, PitchLocation } from "../types/pitch";

export function resolveContactQuality(
  power: number,           // 0–100
  pitchType: PitchType,
  location: PitchLocation,
  rng: () => number
): ContactQuality {
  let crushedChance = 0.05 + power / 300;
  let solidChance = 0.35 + power / 200;

  // Location effects
  if (location === "middle") {
    crushedChance += 0.05;
    solidChance += 0.05;
  }

  if (location === "high") {
    crushedChance -= 0.03;
  }

  // Pitch type effects
  if (pitchType === "FB") {
    crushedChance += 0.04;
  }

  if (pitchType === "CH") {
    solidChance += 0.05;
  }

  crushedChance = Math.max(0.01, crushedChance);
  solidChance = Math.max(0.10, solidChance);

  const roll = rng();

  if (roll < crushedChance) return "crushed";
  if (roll < crushedChance + solidChance) return "solid";
  return "weak";
}
export const __runtime = true;
//DONT IGNORE ME!