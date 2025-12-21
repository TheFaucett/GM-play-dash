import type { RunnerState } from "../../engine/types/halfInning";
import type { AtBatResult } from "../../engine/types/atBat";

export type RunnerAdvanceResult = {
  runnerState: RunnerState;
  runsScored: number;
  outsAdded: number;
};

/**
 * Advances runners based on batted-ball result.
 * This function is PURE and reducer-safe.
 */
export function advanceRunners(
  runnerState: RunnerState,
  result: AtBatResult
): RunnerAdvanceResult {
  // Strikeouts and walks are handled elsewhere
  if (
    result === "strikeout" ||
    result === "walk"
  ) {
    return {
      runnerState,
      runsScored: 0,
      outsAdded: result === "strikeout" ? 1 : 0,
    };
  }

  // Map result → bases
  const bases =
    result === "single" ? 1 :
    result === "double" ? 2 :
    result === "triple" ? 3 :
    result === "home_run" ? 4 :
    0;

  let runsScored = 0;

  // Convert RunnerState → array
  const runners: (string | null)[] = [null, null, null];

  if ("runner1" in runnerState) runners[0] = runnerState.runner1;
  if ("runner2" in runnerState) runners[1] = runnerState.runner2;
  if ("runner3" in runnerState) runners[2] = runnerState.runner3;

  // Advance existing runners (3rd → 1st)
  for (let i = 2; i >= 0; i--) {
    if (!runners[i]) continue;

    const next = i + bases;
    if (next >= 3) {
      runsScored++;
      runners[i] = null;
    } else {
      runners[next] = runners[i];
      runners[i] = null;
    }
  }

  // Place batter
  if (bases < 4) {
    runners[bases - 1] = "batter";
  } else {
    runsScored++;
  }

  // Rebuild RunnerState
  const [r1, r2, r3] = runners;

  let newRunnerState: RunnerState = { type: "empty" };

  if (r1 && r2 && r3)
    newRunnerState = {
      type: "loaded",
      runner1: r1,
      runner2: r2,
      runner3: r3,
    };
  else if (r1 && r2)
    newRunnerState = {
      type: "first_second",
      runner1: r1,
      runner2: r2,
    };
  else if (r1 && r3)
    newRunnerState = {
      type: "first_third",
      runner1: r1,
      runner3: r3,
    };
  else if (r2 && r3)
    newRunnerState = {
      type: "second_third",
      runner2: r2,
      runner3: r3,
    };
  else if (r1)
    newRunnerState = { type: "first", runner1: r1 };
  else if (r2)
    newRunnerState = { type: "second", runner2: r2 };
  else if (r3)
    newRunnerState = { type: "third", runner3: r3 };

  return {
    runnerState: newRunnerState,
    runsScored,
    outsAdded: result === "out" ? 1 : 0,
  };
}
