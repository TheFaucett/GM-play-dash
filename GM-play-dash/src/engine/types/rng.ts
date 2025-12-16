// src/engine/types/rng.ts

export type RNGState = {
  /** Initial seed used to generate the random stream */
  seed: number;

  /** How many random values have been consumed */
  cursor: number;
};
