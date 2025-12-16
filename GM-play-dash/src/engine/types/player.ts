import type { BaseEntity, EntityId } from "./base";

export type Handedness = "R" | "L" | "S";
export type PlayerRole = "SP" | "RP" | "CL" | "BAT";

export type Player = BaseEntity & {
  name: string;
  age: number;
  handedness: Handedness;

  /** Current assignment */
  teamId: EntityId;
  level: "MLB" | "AAA" | "AA" | "A" | "R";

  /** Declared role (can change) */
  role: PlayerRole;

  /** Ratings are intentionally sparse & optional */
  ratings: {
    // batting
    contact?: number;
    power?: number;
    discipline?: number;
    vision?: number;

    // pitching
    stuff?: number;
    command?: number;
    movement?: number;
    stamina?: number;
  };

  /** Runtime state */
  fatigue: number; // 0–100
  health: number;  // 0–100

  /** Historical context (append-only) */
  history: {
    injuries: InjuryRecord[];
    transactions: EntityId[]; // refs to log entries
  };
};

export type InjuryRecord = {
  type: string;
  startDay: number;
  endDay?: number;
};
