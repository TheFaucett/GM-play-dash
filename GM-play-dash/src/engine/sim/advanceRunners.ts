import type { RunnerState } from "../handlers/advanceHalfInning";

export function advanceRunners(
  runnerState: RunnerState,
  bases: number
): { runnerState: RunnerState; runsScored: number } {
  let runsScored = 0;

  // Convert runnerState → array of occupied bases
  const runners: (string | null)[] = [null, null, null];

  if ("runner1" in runnerState) runners[0] = runnerState.runner1;
  if ("runner2" in runnerState) runners[1] = runnerState.runner2;
  if ("runner3" in runnerState) runners[2] = runnerState.runner3;

  // Advance from third to first
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

  // Place batter if not HR
  if (bases < 4) {
    runners[bases - 1] = "batter";
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

  return { runnerState: newRunnerState, runsScored };
}
