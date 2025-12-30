// src/engine/sim/gm/patchRoster.ts

import type { Player, PlayerRole } from "../../types/player";
import type { GMPolicy } from "./gmPolicy";
import { validateRoster } from "../validateRoster";

/**
 * External context the GM needs.
 * You can pass in your global players dictionary + freeAgents list.
 */
export type RosterMarket = {
  freeAgents: Player[];
  minors: Player[]; // call-up candidates
};

export type PatchRosterResult = {
  updatedRoster: Player[];
  signings: string[]; // playerIds
  callups: string[]; // playerIds
  releases: string[]; // playerIds (if over limit)
  errors: string[];
};

/**
 * Patch roster until it passes validateRoster (or we run out of candidates).
 * PURE: returns a new roster array, doesn't mutate input players.
 */
export function patchRoster(args: {
  teamId: string;
  roster: Player[];
  market: RosterMarket;
  policy: GMPolicy;
  roll?: () => number;
}): PatchRosterResult {
  const roll = args.roll ?? Math.random;

  const signings: string[] = [];
  const callups: string[] = [];
  const releases: string[] = [];
  const errors: string[] = [];

  let roster = [...(args.roster ?? [])];

  // 1) Remove injured players from active roster (optional, but stabilizes sim)
  // If you handle IL elsewhere, delete this.
  // roster = roster.filter((p) => (p.health ?? 100) > 0);

  // 2) Fill until roster limit or until validate passes and size is correct
  // We'll be conservative: attempt to satisfy pitcher bounds first.
  const limit = args.policy.roster.rosterLimit;

  // Helper: count roles
  const countPitchers = () =>
    roster.filter((p) => p.role === "SP" || p.role === "RP" || p.role === "CL").length;

  const countBatters = () => roster.filter((p) => p.role === "BAT").length;

  // Candidate pickers
  const pickCandidate = (pool: Player[], desiredRole: PlayerRole): Player | undefined => {
    const candidates = pool.filter((p) => p.role === desiredRole);

    if (candidates.length === 0) return undefined;

    // prefer veterans optionally
    if (args.policy.preferVeterans) {
      candidates.sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
    } else {
      candidates.sort((a, b) => (a.age ?? 0) - (b.age ?? 0));
    }

    // Light randomness to avoid deterministic sameness
    const idx = Math.min(candidates.length - 1, Math.floor(roll() * Math.min(6, candidates.length)));
    return candidates[idx];
  };

  const tryAdd = (desiredRole: PlayerRole) => {
    const useFA = roll() < args.policy.faAggression;

    const pool = useFA ? args.market.freeAgents : args.market.minors;
    const altPool = useFA ? args.market.minors : args.market.freeAgents;

    let pick = pickCandidate(pool, desiredRole) ?? pickCandidate(altPool, desiredRole);
    if (!pick) return false;

    // clone + assign to team
    const signed: Player = {
      ...pick,
      teamId: args.teamId,
      level: "MLB",
      updatedAt: Date.now(),
    };

    roster.push(signed);

    if (useFA && args.market.freeAgents.some((p) => p.id === pick!.id)) signings.push(pick.id);
    else callups.push(pick.id);

    // Remove from market pools so we don't double-use
    args.market.freeAgents = args.market.freeAgents.filter((p) => p.id !== pick!.id);
    args.market.minors = args.market.minors.filter((p) => p.id !== pick!.id);

    return true;
  };

  // A) Ensure minimum pitchers
  while (countPitchers() < args.policy.roster.minPitchers && roster.length < limit) {
    // prefer RP for patching holes, fallback to SP
    if (!tryAdd("RP")) {
      if (!tryAdd("SP")) break;
    }
  }

  // B) Fill remaining slots with batters if below limit
  while (roster.length < limit) {
    // Keep pitchers within max
    if (countPitchers() < args.policy.roster.maxPitchers && roll() < 0.35) {
      if (!tryAdd("RP")) {
        // fallback to batter
        if (!tryAdd("BAT")) break;
      }
    } else {
      if (!tryAdd("BAT")) {
        // fallback to pitcher if no batters exist
        if (!tryAdd("RP") && !tryAdd("SP")) break;
      }
    }
  }

  // C) If over limit, release lowest-priority extras (simple rule)
  while (roster.length > limit) {
    // Release the most fatigued / oldest among bench roles (simple)
    const idx = pickReleaseIndex(roster);
    const [cut] = roster.splice(idx, 1);
    releases.push(cut.id);
  }

  // D) Validate final roster
  const report = validateRoster(roster);
  if (!report.valid) errors.push(...report.errors);

  return { updatedRoster: roster, signings, callups, releases, errors };
}

/* ---------------- Helpers ---------------- */

function pickReleaseIndex(roster: Player[]): number {
  // Prefer cutting BAT first, then RP, last SP/CL
  const scored = roster.map((p, i) => {
    const roleWeight =
      p.role === "BAT" ? 1 :
      p.role === "RP" ? 2 :
      p.role === "CL" ? 3 :
      4;

    const fatigue = p.fatigue ?? 0;
    const age = p.age ?? 0;

    // Higher score = more likely to cut
    const score = roleWeight * 10 + fatigue * 0.2 + age * 0.15;
    return { i, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.i ?? Math.max(0, roster.length - 1);
}
