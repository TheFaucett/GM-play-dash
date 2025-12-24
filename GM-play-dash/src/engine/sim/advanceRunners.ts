import type { RunnerState } from "../../engine/types/halfInning";
import type { AtBatResult } from "../../engine/types/atBat";

export type RunnerAdvanceResult = {
  runnerState: RunnerState;
  runsScored: number;
  outsAdded: number;
};
export function advanceRunners(
  runnerState: RunnerState,
  result: AtBatResult
): { runnerState: RunnerState; runsScored: number; outsAdded: number } {
  let runsScored = 0;
  let outsAdded = 0;

  // Handle outs that don't advance runners
  if (result === "strikeout" || result === "out") {
    return {
      runnerState,
      runsScored: 0,
      outsAdded: 1,
    };
  }

  // Walk
  if (result === "walk") {
    // Force advance logic (simple v1)
    if (runnerState.type === "loaded") {
      runsScored = 1;
      return {
        runnerState: {
          type: "first_second",
          runner1: "batter",
          runner2: runnerState.runner1,
        },
        runsScored,
        outsAdded: 0,
      };
    }

    // Generic fallback
    return {
      runnerState: {
        type: "first",
        runner1: "batter",
      },
      runsScored: 0,
      outsAdded: 0,
    };
  }

  // Hits
  const bases =
    result === "single" ? 1 :
    result === "double" ? 2 :
    result === "triple" ? 3 :
    result === "home_run" ? 4 :
    0;

  // Convert runnerState → array
  const runners: (string | null)[] = [null, null, null];
  if ("runner1" in runnerState) runners[0] = runnerState.runner1;
  if ("runner2" in runnerState) runners[1] = runnerState.runner2;
  if ("runner3" in runnerState) runners[2] = runnerState.runner3;

  // Advance existing runners
  for (let i = 2; i >= 0; i--) {
    if (!runners[i]) continue;

    const target = i + bases;
    if (target >= 3) {
      runsScored++;
    } else {
      runners[target] = runners[i];
    }
    runners[i] = null;
  }

  // Place batter
  if (bases < 4) {
    runners[bases - 1] = "batter"; // THIS IS NOW CORRECT
  } else {
    runsScored++;
  }

  // Rebuild RunnerState
  const [r1, r2, r3] = runners;
  let newRunnerState: RunnerState = { type: "empty" };

  if (r1 && r2 && r3) newRunnerState = { type: "loaded", runner1: r1, runner2: r2, runner3: r3 };
  else if (r1 && r2) newRunnerState = { type: "first_second", runner1: r1, runner2: r2 };
  else if (r1 && r3) newRunnerState = { type: "first_third", runner1: r1, runner3: r3 };
  else if (r2 && r3) newRunnerState = { type: "second_third", runner2: r2, runner3: r3 };
  else if (r1) newRunnerState = { type: "first", runner1: r1 };
  else if (r2) newRunnerState = { type: "second", runner2: r2 };
  else if (r3) newRunnerState = { type: "third", runner3: r3 };

  return {
    runnerState: newRunnerState,
    runsScored,
    outsAdded: 0,
  };
}
