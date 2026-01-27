// src/engine/intent/initPlayerIntent.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { PlayerIntent } from "../types/intent";
import type { Player } from "../types/player";

/**
 * Initializes intent for all players in the league.
 *
 * This should be called:
 * - at league creation, OR
 * - at the start of the first OFFSEASON
 *
 * IMPORTANT:
 * - This does NOT mutate players
 * - This does NOT evaluate happiness
 * - This only establishes baseline intent
 */
export function initPlayerIntent(
  state: LeagueState
): Record<EntityId, PlayerIntent> {
  const intents: Record<EntityId, PlayerIntent> = {};

  for (const [playerId, player] of Object.entries(state.players)) {
    intents[playerId as EntityId] = createBaselineIntent(player);
  }

  return intents;
}

/* ==============================================
   BASELINE INTENT RULES
============================================== */

function createBaselineIntent(player: Player): PlayerIntent {
  const age = player.age;
  const role = player.role;

  // Core priority (very coarse on purpose)
  let corePriority: PlayerIntent["corePriority"];

  if (age <= 23) {
    corePriority = "ROLE";
  } else if (age <= 28) {
    corePriority = "WINNING";
  } else {
    corePriority = "SECURITY";
  }

  // Role-based bias
  if (role === "CL" || role === "SP") {
    corePriority = corePriority === "ROLE"
      ? "WINNING"
      : corePriority;
  }

  return {
    corePriority,

    // How long before dissatisfaction matters
    patience: basePatience(age),

    // How volatile their mood is
    volatility: baseVolatility(age),

    // Neutral starting satisfaction
    satisfaction: 0,
  };
}

/* ==============================================
   HELPERS
============================================== */

function basePatience(age: number): number {
  if (age <= 22) return 120;
  if (age <= 26) return 90;
  if (age <= 30) return 60;
  return 40;
}

function baseVolatility(age: number): number {
  if (age <= 22) return 0.3;
  if (age <= 28) return 0.2;
  return 0.1;
}
