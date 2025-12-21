export type BatterDecision = "take" | "swing";

export function decideBatterAction(
  discipline: number, // 0–100
  balls: number,
  strikes: number,
  location: "high" | "middle" | "low",
  rng: () => number
): BatterDecision {
  let swingChance = 0.55;

  // Discipline lowers chase rate
  swingChance -= (discipline - 50) / 200;

  // Count leverage
  if (balls >= 3) swingChance -= 0.15;
  if (strikes >= 2) swingChance += 0.20;

  // Location influence
  if (location === "middle") swingChance += 0.10;
  if (location === "high") swingChance -= 0.05;

  // Clamp
  swingChance = Math.max(0.05, Math.min(0.95, swingChance));

  return rng() < swingChance ? "swing" : "take";
}
