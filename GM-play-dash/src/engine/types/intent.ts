// types/intent.ts
export type PlayerIntent = {
  corePriority: "SECURITY" | "MONEY" | "WINNING" | "ROLE";
  patience: number;       // days before frustration
  volatility: number;     // how fast mood shifts
  satisfaction: number;  // -100 → +100
};

export type TeamIntent = {
  direction: "CONTEND" | "HOLD" | "REBUILD";
  riskTolerance: number;
  spendBias: number;
};
