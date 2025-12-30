// engine/sim/assignFieldingPositions.ts

import type { PlayerLatents } from "../types/player";

/* ============================================
   FIELDING POSITIONS
============================================ */

export type FieldingPosition =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH";

export type FieldingProfile = {
  primary: FieldingPosition;
  secondary: FieldingPosition[];
};

/* ============================================
   HELPERS
============================================ */

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function rankPositions(
  scores: Record<FieldingPosition, number>
): FieldingPosition[] {
  return (Object.entries(scores) as [FieldingPosition, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([pos]) => pos);
}

/* ============================================
   POSITION SCORING
============================================ */

function scorePositions(
  latents: PlayerLatents
): Record<FieldingPosition, number> {
  const athleticism = latents.common.athleticism;
  const consistency = latents.common.consistency;

  const batter = latents.batter;
  const pitcher = latents.pitcher;

  const armStrength =
    pitcher?.armStrength ??
    batter?.batSpeed ??
    athleticism;

  const reaction =
    batter?.plateVision ??
    consistency;

  const strength =
    batter?.batSpeed ??
    pitcher?.armStrength ??
    athleticism;

  return {
    SS:
      athleticism * 0.45 +
      reaction * 0.35 +
      consistency * 0.20,

    "2B":
      athleticism * 0.40 +
      reaction * 0.40 +
      consistency * 0.20,

    "3B":
      strength * 0.45 +
      reaction * 0.30 +
      armStrength * 0.25,

    "1B":
      strength * 0.55 +
      consistency * 0.30 +
      (100 - athleticism) * 0.15,

    C:
      reaction * 0.40 +
      consistency * 0.35 +
      armStrength * 0.25,

    CF:
      athleticism * 0.55 +
      reaction * 0.25 +
      consistency * 0.20,

    RF:
      armStrength * 0.45 +
      strength * 0.35 +
      athleticism * 0.20,

    LF:
      strength * 0.45 +
      athleticism * 0.35 +
      consistency * 0.20,

    DH:
      strength * 0.60 +
      consistency * 0.40,
  };
}

/* ============================================
   MAIN ENTRY
============================================ */

export function assignFieldingPositions(
  latents?: PlayerLatents
): FieldingProfile {
  // Hard fallback
  if (!latents) {
    return {
      primary: "DH",
      secondary: [],
    };
  }

  const scores = scorePositions(latents);
  const ranked = rankPositions(scores);

  const primary = ranked[0];
  const primaryScore = scores[primary];

  const secondary = ranked.filter((pos) => {
    if (pos === primary) return false;

    // DH only allowed if athleticism is poor
    if (
      pos === "DH" &&
      latents.common.athleticism > 45
    ) {
      return false;
    }

    // Must be reasonably close to primary skill
    return scores[pos] >= primaryScore * 0.85;
  });

  return {
    primary,
    secondary: secondary.slice(0, 3),
  };
}
