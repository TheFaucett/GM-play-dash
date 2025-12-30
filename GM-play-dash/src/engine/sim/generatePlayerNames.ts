// engine/sim/generatePlayerName.ts

import { FIRST_NAMES } from "../data/firstNames";
import { LAST_NAMES } from "../data/lastNames";

/* ==============================================
   TYPES
============================================== */

export type GeneratedName = {
  first: string;
  last: string;
  middleInitial?: string;
  suffix?: string;
  full: string;
};

/* ==============================================
   RNG (LOCAL, SEEDED)
============================================== */

function makeRoll(seed: number): () => number {
  let x = Math.floor(seed * 1e9);
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

function pick<T>(arr: readonly T[], roll: () => number): T {
  return arr[Math.floor(roll() * arr.length)];
}

/* ==============================================
   NAME GENERATION
============================================== */

const SUFFIXES = ["Jr.", "Sr.", "II", "III"];
const MIDDLE_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function generatePlayerName(seed: number): GeneratedName {
  const roll = makeRoll(seed);

  const first = pick(FIRST_NAMES, roll);
  const last = pick(LAST_NAMES, roll);

  // ~18% chance of middle initial
  const middleInitial =
    roll() < 0.18 ? pick(MIDDLE_INITIALS, roll) : undefined;

  // ~4% chance of suffix (rare, feels right)
  const suffix =
    roll() < 0.04 ? pick(SUFFIXES, roll) : undefined;

  let full = first;

  if (middleInitial) {
    full += ` ${middleInitial}.`;
  }

  full += ` ${last}`;

  if (suffix) {
    full += ` ${suffix}`;
  }

  return {
    first,
    last,
    middleInitial,
    suffix,
    full,
  };
}
