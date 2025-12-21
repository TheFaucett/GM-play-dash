import type { RunnerState } from "../engine/types/halfInning";

/* =========================================
   At-Bat start narration
   ========================================= */

export function narrateAtBatStart(
  runnerState: RunnerState,
  outs: number
): string {
  const runners = describeRunners(runnerState);
  const outsText = describeOuts(outs);

  if (runners && outsText) {
    return `${runners}, ${outsText}.`;
  }

  if (runners) return `${runners}.`;
  if (outsText) return `${outsText}.`;

  return "New at-bat.";
}

/* -----------------------------------------
   Helpers
----------------------------------------- */

function describeRunners(runnerState: RunnerState): string {
  switch (runnerState.type) {
    case "empty":
      return "Bases empty";
    case "first":
      return "Runner on first";
    case "second":
      return "Runner on second";
    case "third":
      return "Runner on third";
    case "first_second":
      return "Runners on first and second";
    case "first_third":
      return "Runners on first and third";
    case "second_third":
      return "Runners on second and third";
    case "loaded":
      return "Bases loaded";
    default:
      return "";
  }
}

function describeOuts(outs: number): string {
  if (outs === 0) return "no outs";
  if (outs === 1) return "one out";
  if (outs === 2) return "two outs";
  return "";
}
