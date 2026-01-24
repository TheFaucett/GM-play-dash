import type { EntityId } from "./base";

/* ==============================================
   TEAM
============================================== */

export type TeamMarketSize =
  | "small"
  | "mid"
  | "large";

export type Team = {
  id: EntityId;
  name: string;

  /* --------------------------------------------
     MARKET / FRANCHISE IDENTITY  ✅ STEP 2
  -------------------------------------------- */

  marketSize: TeamMarketSize;

  /**
   * Abstract budget signal (not dollars yet)
   * - small: ~0.7
   * - mid:   ~1.0
   * - large: ~1.3
   *
   * This will later affect:
   * - payroll ceiling
   * - FA aggressiveness
   * - tolerance for dead money
   */
  budgetFactor: number;

  /* --------------------------------------------
     BATTING
  -------------------------------------------- */

  lineup: EntityId[];        // length 9
  lineupIndex: number;       // current hitter (0–8)

  /* --------------------------------------------
     PITCHING
  -------------------------------------------- */

  rotation: EntityId[];      // starters (index 0 = today’s starter)
  bullpen: EntityId[];       // relievers

  /* --------------------------------------------
     GAME STATE
  -------------------------------------------- */

  activePitcherId?: EntityId;
};
