import type { EntityId } from "./base";

export type Team = {
  id: EntityId;
  name: string;

  // Batting
  lineup: EntityId[];        // length 9
  lineupIndex: number;       // current hitter (0–8)

  // Pitching
  rotation: EntityId[];      // starters (index 0 = today’s starter)
  bullpen: EntityId[];       // relievers

  // Game state
  activePitcherId?: EntityId;
};
