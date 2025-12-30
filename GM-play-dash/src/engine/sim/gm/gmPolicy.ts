// src/engine/sim/gm/gmPolicy.ts

/**
 * GM = roster / callups / free agents.
 * Runs only during "Sim Season" / auto-sim windows.
 * Does NOT run while user is actively controlling a team.
 */
export type GMPolicy = {
  roster: {
    rosterLimit: number;
    minPitchers: number;
    maxPitchers: number;

    /** Optional positional coverage enforcement (if you have fielding positions) */
    requirePositions?: boolean;
  };

  /**
   * 0..1
   * Higher = sign FA more often, lower = prefer call-ups.
   */
  faAggression: number;

  /** If true, prefer older players when patching holes */
  preferVeterans: boolean;
};

export const DEFAULT_GM_POLICY: GMPolicy = {
  roster: {
    rosterLimit: 26,
    minPitchers: 11,
    maxPitchers: 14,
    requirePositions: false,
  },
  faAggression: 0.55,
  preferVeterans: true,
};
