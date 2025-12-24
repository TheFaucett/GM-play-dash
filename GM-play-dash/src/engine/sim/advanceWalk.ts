import type { RunnerState } from "../types/halfInning";

export function advanceOnWalk(
  runnerState: RunnerState
): { runnerState: RunnerState; runsScored: number } {
  let runsScored = 0;

  switch (runnerState.type) {
    case "empty":
      return {
        runnerState: { type: "first", runner1: "batter" },
        runsScored: 0,
      };

    case "first":
      return {
        runnerState: {
          type: "first_second",
          runner1: "batter",
          runner2: runnerState.runner1,
        },
        runsScored: 0,
      };

    case "second":
      return {
        runnerState: {
          type: "first_second",
          runner1: "batter",
          runner2: runnerState.runner2,
        },
        runsScored: 0,
      };

    case "third":
      return {
        runnerState: {
          type: "first_third",
          runner1: "batter",
          runner3: runnerState.runner3,
        },
        runsScored: 0,
      };

    case "first_second":
      return {
        runnerState: {
          type: "loaded",
          runner1: "batter",
          runner2: runnerState.runner1,
          runner3: runnerState.runner2,
        },
        runsScored: 0,
      };

    case "first_third":
      return {
        runnerState: {
          type: "loaded",
          runner1: "batter",
          runner2: runnerState.runner1,
          runner3: runnerState.runner3,
        },
        runsScored: 0,
      };

    case "second_third":
      return {
        runnerState: {
          type: "loaded",
          runner1: "batter",
          runner2: runnerState.runner2,
          runner3: runnerState.runner3,
        },
        runsScored: 0,
      };

    case "loaded":
      runsScored = 1;
      return {
        runnerState: {
          type: "first_second",
          runner1: "batter",
          runner2: runnerState.runner1,
        },
        runsScored,
      };
  }
}
