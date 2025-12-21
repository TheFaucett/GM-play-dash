import type { RunnerState } from "../types/halfInning";
import type { BattedBallType } from "../types/battedBall";
import type { AtBatResult } from "../types/atBat";
import type { AtBatPlay } from "../types/atBat";

import { weightedRoll } from "./weightedRoll";
import { INPLAY_TABLES } from "./inPlayOutcomeTables";

type Quality = "weak" | "solid" | "crushed";

function hasRunnerOnFirst(rs: RunnerState): boolean {
  return "runner1" in rs && !!rs.runner1;
}
function hasRunnerOnThird(rs: RunnerState): boolean {
  return "runner3" in rs && !!rs.runner3;
}

/**
 * Step 20: Given batted-ball type + contact quality, resolve:
 * - hit/out result
 * - double play chance
 * - sac fly chance
 * - runnerStateAfter overrides when needed
 *
 * NOTE: This function does NOT mutate LeagueState. Pure.
 */
export function resolveInPlay(
  runnerState: RunnerState,
  outs: number,
  battedBallType: BattedBallType,
  contactQuality: Quality,
  roll: () => number
): { result: AtBatResult; play: AtBatPlay } {
  // -------------------------
  // DOUBLE PLAY (simple v1)
  // -------------------------
  if (
    battedBallType === "ground_ball" &&
    outs <= 1 &&
    hasRunnerOnFirst(runnerState)
  ) {
    // crude baseline DP chance — tune later with speed/arm/etc.
    const dpChance = contactQuality === "weak" ? 0.28 : 0.18;

    if (roll() < dpChance) {
      return {
        result: "out",
        play: {
          outsAdded: 2,
          runsScored: 0,
          runnerStateAfter: { type: "empty" }, // v1: clears bases
          battedBallType,
          note: "double_play",
        },
      };
    }
  }

  // -------------------------
  // SAC FLY (simple v1)
  // -------------------------
  if (
    battedBallType === "fly_ball" &&
    outs <= 1 &&
    hasRunnerOnThird(runnerState)
  ) {
    // Only on non-weak contact
    const sacChance = contactQuality === "weak" ? 0.0 : 0.45;

    if (roll() < sacChance) {
      // runner from third scores, batter is out, others hold (v1)
      const next: RunnerState =
        runnerState.type === "third"
          ? { type: "empty" }
          : runnerState.type === "first_third"
            ? { type: "first", runner1: runnerState.runner1 }
            : runnerState.type === "second_third"
              ? { type: "second", runner2: runnerState.runner2 }
              : runnerState.type === "loaded"
                ? { type: "first_second", runner1: runnerState.runner1, runner2: runnerState.runner2 }
                : runnerState;

      return {
        result: "out",
        play: {
          outsAdded: 1,
          runsScored: 1,
          runnerStateAfter: next,
          battedBallType,
          note: "sac_fly",
        },
      };
    }
  }

  // -------------------------
  // NORMAL HIT/OUT RESOLUTION
  // -------------------------
  const table = INPLAY_TABLES[battedBallType][contactQuality];
  const outcome = weightedRoll(table, roll);

  // hits are advanced later by advanceAtBat (via advanceRunners) unless overridden
  return {
    result: outcome as AtBatResult,
    play: {
      outsAdded: outcome === "out" ? 1 : 0,
      runsScored: 0,
      battedBallType,
      note: outcome,
    },
  };
}
