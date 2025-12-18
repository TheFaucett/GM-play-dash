export function weightedRoll<T extends string>(
  table: Record<T, number>,
  rng: () => number
): T {
  const roll = rng();
  let cumulative = 0;

  for (const key in table) {
    cumulative += table[key];
    if (roll <= cumulative) {
      return key;
    }
  }

  // Fallback (floating point safety)
  return Object.keys(table)[0] as T;
}
