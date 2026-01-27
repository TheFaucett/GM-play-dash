// src/engine/intent/initTeamIntent.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { TeamIntent } from "../types/intent";
import type { Team } from "../types/team";

/**
 * Initializes intent for all teams in the league.
 *
 * This should be called:
 * - at league creation
 * - or at the start of each OFFSEASON
 *
 * Team intent is intentionally coarse.
 * It will drift over time via evaluation.
 */
export function initTeamIntent(
  state: LeagueState
): Record<EntityId, TeamIntent> {
  const intents: Record<EntityId, TeamIntent> = {};

  for (const [teamId, team] of Object.entries(state.teams)) {
    intents[teamId as EntityId] = createBaselineTeamIntent(team);
  }

  return intents;
}

/* ==============================================
   BASELINE TEAM INTENT RULES
============================================== */

function createBaselineTeamIntent(team: Team): TeamIntent {
  let direction: TeamIntent["direction"];
  let riskTolerance: number;
  let spendBias: number;

  switch (team.marketSize) {
    case "large":
      direction = "CONTEND";
      riskTolerance = 0.7;
      spendBias = 1.2;
      break;

    case "mid":
      direction = "HOLD";
      riskTolerance = 0.5;
      spendBias = 1.0;
      break;

    case "small":
    default:
      direction = "REBUILD";
      riskTolerance = 0.3;
      spendBias = 0.8;
      break;
  }

  return {
    direction,
    riskTolerance,
    spendBias,
  };
}
