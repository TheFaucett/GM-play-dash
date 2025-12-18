export function nextRandom(
  rng: { seed: number; cursor: number }
): number {
  // Simple LCG (deterministic, cheap, good enough for now)
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;

  const nextSeed = (a * rng.seed + c) % m;
  rng.seed = nextSeed;
  rng.cursor += 1;

  return nextSeed / m;
}
