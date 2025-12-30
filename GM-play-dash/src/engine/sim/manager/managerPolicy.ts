// src/engine/sim/manager/managerPolicy.ts

/**
 * Manager = in-game / game-to-game rules.
 * NO roster moves, NO signings, NO long-term planning.
 * Purely reactive.
 */

export type ManagerPolicy = {
  hook: {
    /** When to start considering pulling the pitcher */
    softPitchCount: number;
    /** Hard cap: always pull */
    hardPitchCount: number;

    /** Start considering pull if fatigue >= this */
    fatigueSoft: number;
    /** Always pull if fatigue >= this */
    fatigueHard: number;
  };

  bullpen: {
    /** Soft pitch cap for a reliever in one outing (tune later) */
    maxRelieverPitches: number;

    /**
     * If leverage >= this, prefer the closer if available.
     * 0..1 scale.
     */
    closerUsageLeverage: number;
  };

  /**
   * 0..1
   * Higher = quicker hook / more proactive.
   */
  aggression: number;
};

export const DEFAULT_MANAGER_POLICY: ManagerPolicy = {
  hook: {
    softPitchCount: 85,
    hardPitchCount: 110,
    fatigueSoft: 60,
    fatigueHard: 78,
  },
  bullpen: {
    maxRelieverPitches: 28,
    closerUsageLeverage: 0.75,
  },
  aggression: 0.55,
};
