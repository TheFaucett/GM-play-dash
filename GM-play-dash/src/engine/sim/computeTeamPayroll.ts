// src/engine/sim/computeTeamPayroll.ts
//
// Purpose:
// - Derive a team's payroll from player contracts (no stored totals).
// - Split MLB vs AAA for quick roster/economy screens.
// - Provide "space" = budget - payroll for enforcement + UI.
//
// Assumptions (v1):
// - Budgets are stored in $M (ex: 140 means $140M)
// - Contracts SHOULD be stored in $M, but legacy data may contain raw dollars.
//   ✅ This module defensively normalizes salaries:
//      if annualSalary (or addAav) >= 1000, treat as dollars and convert to $M.
// - Only players whose player.teamId === teamId count toward payroll
// - MLB vs AAA is based on player.level
// - If you later add retained salary / dead money, extend here (do not store derived totals)

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Player } from "../types/player";

export type TeamPayroll = {
  teamId: EntityId;

  // payroll totals (in $M)
  mlbPayroll: number;
  aaaPayroll: number;
  totalPayroll: number;

  // team finance inputs (authoritative, in $M)
  budget: number;
  cash: number;

  // derived (in $M)
  space: number; // budget - totalPayroll
};

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function safeMoney(n: unknown): number {
  return isFiniteNum(n) ? n : 0;
}

function roundMoney(n: number): number {
  return Math.round(n * 10) / 10; // one decimal place is plenty for v1
}

/**
 * Normalize a salary amount into $M.
 * - If value looks like raw dollars (>= 1000), convert to $M.
 * - Otherwise assume it's already $M.
 */
function toMillions(raw: unknown): number {
  const n = safeMoney(raw);
  if (n <= 0) return 0;
  return n >= 1000 ? n / 1_000_000 : n;
}

/**
 * Compute payroll for a team (derived).
 */
export function computeTeamPayroll(state: LeagueState, teamId: EntityId): TeamPayroll {
  const team = state.teams[teamId];

  const budget = toMillions((team as any)?.budget);
  const cash = toMillions((team as any)?.cash);

  let mlb = 0;
  let aaa = 0;

  for (const p of Object.values(state.players) as Player[]) {
    if (!p) continue;
    if (p.teamId !== teamId) continue;

    const aavM = toMillions(p.contract?.annualSalary);
    if (aavM <= 0) continue;

    if (p.level === "MLB") mlb += aavM;
    else if (p.level === "AAA") aaa += aavM;
    // Future: AA/A/R buckets here if you want, or keep them as "minors"
  }

  const total = mlb + aaa;

  return {
    teamId,
    mlbPayroll: roundMoney(mlb),
    aaaPayroll: roundMoney(aaa),
    totalPayroll: roundMoney(total),
    budget: roundMoney(budget),
    cash: roundMoney(cash),
    space: roundMoney(budget - total),
  };
}

/**
 * Convenience: compute payroll for every team (derived).
 * Useful for league-wide tables / AI decisions.
 */
export function computeAllTeamPayrolls(state: LeagueState): Record<EntityId, TeamPayroll> {
  const out: Record<EntityId, TeamPayroll> = {} as any;
  for (const teamId of Object.keys(state.teams) as EntityId[]) {
    out[teamId] = computeTeamPayroll(state, teamId);
  }
  return out;
}

/**
 * Utility: what would payroll space be AFTER adding a contract AAV?
 * (Use this in signing/offer enforcement.)
 *
 * addAav may be either:
 * - $M (ex: 8)
 * - dollars (ex: 8000000) ✅ auto-normalized
 */
export function wouldExceedPayroll(
  state: LeagueState,
  teamId: EntityId,
  addAav: number
): { wouldExceed: boolean; spaceAfter: number; current: TeamPayroll } {
  const current = computeTeamPayroll(state, teamId);

  const addAavM = toMillions(addAav);
  const spaceAfter = roundMoney(current.space - addAavM);

  return {
    wouldExceed: spaceAfter < 0,
    spaceAfter,
    current,
  };
}