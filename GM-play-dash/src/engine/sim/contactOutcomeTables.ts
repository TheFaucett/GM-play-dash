export type ContactOutcome =
  | "out"
  | "single"
  | "double"
  | "triple"
  | "home_run";

export type ContactOutcomeTable =
  Record<ContactOutcome, number>;

export const WEAK_CONTACT: ContactOutcomeTable = {
  out: 0.75,
  single: 0.20,
  double: 0.04,
  triple: 0.00,
  home_run: 0.01,
};

export const SOLID_CONTACT: ContactOutcomeTable = {
  out: 0.45,
  single: 0.30,
  double: 0.15,
  triple: 0.03,
  home_run: 0.07,
};

export const CRUSHED_CONTACT: ContactOutcomeTable = {
  out: 0.20,
  single: 0.20,
  double: 0.25,
  triple: 0.05,
  home_run: 0.30,
};
