import type { BattedBallType } from "../types/battedBall";

export type ContactOutcome =
  | "out"
  | "single"
  | "double"
  | "triple"
  | "home_run";

export type ContactOutcomeTable = Record<ContactOutcome, number>;

type Quality = "weak" | "solid" | "crushed";

export const INPLAY_TABLES: Record<
  BattedBallType,
  Record<Quality, ContactOutcomeTable>
> = {
  ground_ball: {
    weak:   { out: 0.82, single: 0.15, double: 0.02, triple: 0.00, home_run: 0.01 },
    solid:  { out: 0.62, single: 0.28, double: 0.08, triple: 0.01, home_run: 0.01 },
    crushed:{ out: 0.45, single: 0.30, double: 0.20, triple: 0.02, home_run: 0.03 },
  },
  fly_ball: {
    weak:   { out: 0.88, single: 0.06, double: 0.03, triple: 0.01, home_run: 0.02 },
    solid:  { out: 0.62, single: 0.12, double: 0.10, triple: 0.03, home_run: 0.13 },
    crushed:{ out: 0.38, single: 0.08, double: 0.12, triple: 0.02, home_run: 0.40 },
  },
  line_drive: {
    weak:   { out: 0.55, single: 0.30, double: 0.12, triple: 0.02, home_run: 0.01 },
    solid:  { out: 0.30, single: 0.35, double: 0.26, triple: 0.05, home_run: 0.04 },
    crushed:{ out: 0.18, single: 0.22, double: 0.32, triple: 0.08, home_run: 0.20 },
  },
  pop_up: {
    weak:    { out: 0.98, single: 0.01, double: 0.00, triple: 0.00, home_run: 0.01 },
    solid:  { out: 0.95, single: 0.03, double: 0.01, triple: 0.00, home_run: 0.01 },
    crushed:{ out: 0.90, single: 0.05, double: 0.02, triple: 0.01, home_run: 0.02 },
  },
};
