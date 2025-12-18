export type PitchOutcome =
  | "ball"
  | "strike"
  | "foul"
  | "in_play";

export const BASE_PITCH_TABLE: Record<PitchOutcome, number> = {
  ball: 0.32,
  strike: 0.33,
  foul: 0.20,
  in_play: 0.15,
};
