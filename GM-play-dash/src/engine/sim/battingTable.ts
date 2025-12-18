export type BattingOutcome =
  | "out"
  | "walk"
  | "single"
  | "double"
  | "triple"
  | "home_run";

export const BASE_BATTING_TABLE: Record<BattingOutcome, number> = {
  out: 0.67,
  walk: 0.08,
  single: 0.15,
  double: 0.06,
  triple: 0.01,
  home_run: 0.03,
};
