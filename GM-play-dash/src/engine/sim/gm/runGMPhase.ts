// src/engine/sim/gm/runGMPhase.ts

import type { Player } from "../../types/player";
import type { GMPolicy } from "./gmPolicy";
import { buildTeamSnapshot } from "./teamSnapshot";
import { patchRoster, type RosterMarket } from "./patchRoster";
import { rotateBullpen } from "./rotateBullpen";

/**
 * Minimal Team type fallback.
 * If you already have engine/types/team.ts, replace this import + type.
 */
export type GMTeam = {
  id: string;
  playerIds: string[];
};

/**
 * Runs GM logic for a team.
 * - Should be called only in auto-sim windows (series/week/season sim).
 * - Must NOT run for user-controlled team.
 *
 * This function is PURE with respect to your main state:
 * it returns updated players + team playerIds.
 */
export function runGMPhase(args: {
  team: GMTeam;

  // Global player registry so GM can resolve players by id
  playersById: Record<string, Player>;

  // Market pools (pass snapshots for FA/minors)
  market: RosterMarket;

  policy: GMPolicy;

  isUserControlledTeam: boolean;

  roll?: () => number;
}): {
  updatedPlayersById: Record<string, Player>;
  updatedTeam: GMTeam;
  report: {
    signings: string[];
    callups: string[];
    releases: string[];
    errors: string[];
  };
} {
  const roll = args.roll ?? Math.random;

  if (args.isUserControlledTeam) {
    // No automation; return unchanged
    return {
      updatedPlayersById: args.playersById,
      updatedTeam: args.team,
      report: { signings: [], callups: [], releases: [], errors: [] },
    };
  }

  const teamPlayers: Player[] = args.team.playerIds
    .map((id) => args.playersById[id])
    .filter(Boolean);

  const snapshot = buildTeamSnapshot(teamPlayers);

  // 1) Patch roster to valid 26-man with role bounds
  const patched = patchRoster({
    teamId: args.team.id,
    roster: teamPlayers,
    market: args.market,
    policy: args.policy,
    roll,
  });

  let roster = patched.updatedRoster;

  // 2) If bullpen is totally cooked, rotate a reliever
  if (snapshot.overworkedPitchers.length >= 3) {
    const rot = rotateBullpen({
      teamId: args.team.id,
      roster,
      minors: args.market.minors,
      roll,
    });

    roster = rot.updatedRoster;
    patched.callups.push(...rot.callups);
    patched.releases.push(...rot.sentDown);
  }

  // 3) Write roster back into global playersById (update team assignment)
  const updatedPlayersById: Record<string, Player> = { ...args.playersById };
  const newPlayerIds: string[] = [];

  for (const p of roster) {
    updatedPlayersById[p.id] = p;
    newPlayerIds.push(p.id);
  }

  return {
    updatedPlayersById,
    updatedTeam: { ...args.team, playerIds: newPlayerIds },
    report: {
      signings: patched.signings,
      callups: patched.callups,
      releases: patched.releases,
      errors: patched.errors,
    },
  };
}
