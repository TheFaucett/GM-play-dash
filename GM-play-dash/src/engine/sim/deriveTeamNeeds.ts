import type { LeagueState } from "../types/league";
import type { Team } from "../types/team";
import type { PlayerRole } from "../types/player";

/* ==============================================
   TYPES
============================================== */

/**
 * Coarse team needs model.
 *
 * Positive = need
 * Zero = neutral
 * Negative = surplus
 *
 * Range is intentionally small and capped.
 */
export type TeamNeeds = {
  SP: number;
  RP: number;
  BAT: number;
};

/* ==============================================
   CONFIG (PHASE B2 — TUNABLE)
============================================== */

/**
 * Target roster composition (VERY rough).
 * This is not lineup logic — just valuation guidance.
 */
const TARGET_COUNTS: Record<PlayerRole, number> = {
  SP: 5,
  RP: 8, // includes CL
  CL: 0, // handled as RP
  BAT: 13,
};

/**
 * Maximum magnitude for need/surplus.
 * Prevents extreme multipliers later.
 */
const NEED_CAP = 4;

/* ==============================================
   PUBLIC API
============================================== */

/**
 * Derives coarse roster needs for a team.
 *
 * HARD GUARANTEES:
 * - Pure
 * - Deterministic
 * - No mutation
 * - No contract or value logic
 *
 * INTENT:
 * - Feeds AI evaluation & trade logic
 * - NOT a roster validator
 */
export function deriveTeamNeeds(
  state: LeagueState,
  team: Team
): TeamNeeds {
  const counts = countTeamRoles(state, team.id);

  return {
    SP: clampNeed(TARGET_COUNTS.SP - counts.SP),
    RP: clampNeed(TARGET_COUNTS.RP - counts.RP),
    BAT: clampNeed(TARGET_COUNTS.BAT - counts.BAT),
  };
}

/* ==============================================
   HELPERS
============================================== */

function countTeamRoles(
  state: LeagueState,
  teamId: string
): Record<"SP" | "RP" | "BAT", number> {
  let SP = 0;
  let RP = 0;
  let BAT = 0;

  for (const player of Object.values(state.players)) {
    if (player.teamId !== teamId) continue;

    switch (player.role) {
      case "SP":
        SP++;
        break;

      case "RP":
      case "CL":
        RP++;
        break;

      case "BAT":
        BAT++;
        break;
    }
  }

  return { SP, RP, BAT };
}

function clampNeed(n: number): number {
  if (n > NEED_CAP) return NEED_CAP;
  if (n < -NEED_CAP) return -NEED_CAP;
  return n;
}
