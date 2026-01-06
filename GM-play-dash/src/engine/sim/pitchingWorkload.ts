import type { PlayerRole } from "../types/player";

/* =====================================
   TYPES
===================================== */

export type PitchWorkload =
  | "light"
  | "standard"
  | "long"
  | "starter_heavy";

/* =====================================
   CLASSIFICATION
===================================== */

/**
 * Classifies a pitching appearance by role + pitch count.
 */
export function classifyPitchWorkload(
  role: PlayerRole,
  pitchCount: number
): PitchWorkload {
  if (role === "SP") {
    if (pitchCount >= 100) return "starter_heavy";
    return "standard";
  }

  // Relievers
  if (pitchCount <= 20) return "light";
  if (pitchCount <= 35) return "standard";
  return "long";
}

/* =====================================
   REST REQUIREMENTS
===================================== */

/**
 * Returns how many rest days are required
 * before full recovery is allowed.
 */
export function requiredRestDays(
  workload: PitchWorkload,
  consecutiveDaysPitched: number = 0
): number {
  switch (workload) {
    case "starter_heavy":
      return 5;

    case "standard":
      return 4;

    case "light":
      // Relievers can go back-to-back, but not forever
      return consecutiveDaysPitched >= 3 ? 1 : 0;

    case "long":
      return 3;

    default:
      return 1;
  }
}

/* =====================================
   AVAILABILITY CHECK
===================================== */

/**
 * Quick availability test for managers / sim logic.
 */
export function isPitcherAvailable(args: {
  role: PlayerRole;
  pitchCountLast?: number;
  lastDay?: number;
  currentDay: number;
  consecutiveDays?: number;
}): boolean {
  if (!args.lastDay || args.pitchCountLast == null) {
    return true;
  }

  const workload = classifyPitchWorkload(
    args.role,
    args.pitchCountLast
  );

  const required = requiredRestDays(
    workload,
    args.consecutiveDays ?? 0
  );

  const daysRested = args.currentDay - args.lastDay;

  return daysRested >= required;
}
