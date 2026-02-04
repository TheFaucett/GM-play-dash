// src/engine/sim/evaluatePlayerForTeam.ts

import type { LeagueState } from "../types/league";
import type { Team } from "../types/team";
import type { Player } from "../types/player";

import { deriveTeamNeeds } from "./deriveTeamNeeds";

/**
 * Evaluates how valuable a specific player is to a specific team RIGHT NOW.
 *
 * Goal:
 * - Keep Player.value as "intrinsic"
 * - Add team-context on top (needs / roster fit)
 *
 * HARD GUARANTEES:
 * - Pure (no mutation)
 * - Deterministic
 * - Safe for UI + AI + trade logic
 *
 * Phase B2.5 (simple + stable):
 * - Base = player.value.total (fallback: player.value.overall, fallback: 50)
 * - Needs multiplier based on role pressure
 */
export function evaluatePlayerForTeam(args: {
  state: LeagueState;
  team: Team;
  player: Player;
}): number {
  const { state, team, player } = args;

  const base = getBaseValue(player);

  const needs = deriveTeamNeeds(state, team);

  // This assumes deriveTeamNeeds returns something like:
  // { SP: number; RP: number; CL: number; BAT: number }
  // If your keys differ, adjust here.
  const roleNeedScore =
    // @ts-expect-error (in case your needs type isn't strict yet)
    (needs?.[player.role] ?? 0) as number;

  const multiplier = needMultiplier(roleNeedScore);

  // Clamp to avoid insane outputs in early tuning
  const adjusted = clamp(base * multiplier, 0, 200);

  return Math.round(adjusted);
}

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

function getBaseValue(player: Player): number {
  // Preferred: total (authoritative scalar)
  const total =
    (player as any)?.value?.total;

  if (typeof total === "number") return total;

  // Fallback: overall (0–100)
  const overall =
    (player as any)?.value?.overall;

  if (typeof overall === "number") return overall;

  // Final fallback: neutral baseline
  return 50;
}

/**
 * Converts a need score into a value multiplier.
 *
 * Convention:
 * - Positive = need (boost value)
 * - Negative = surplus (discount value)
 * - 0 = neutral
 *
 * You can tune these easily later.
 */
function needMultiplier(needScore: number): number {
  if (needScore >= 3) return 1.25;
  if (needScore === 2) return 1.15;
  if (needScore === 1) return 1.05;

  if (needScore === 0) return 1.0;

  if (needScore === -1) return 0.9;
  if (needScore === -2) return 0.8;
  return 0.7; // -3 or worse
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
