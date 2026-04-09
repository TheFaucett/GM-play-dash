import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Player } from "../types/player";
import type { RosterView } from "./deriveRosterView";
import { getRosterStatus } from "./getRosterStatus";

export type RosterViolation = {
  code:
    | "ACTIVE_OVER_26"
    | "FORTY_OVER_40"
    | "MLB_NOT_ON_40"
    | "DEPTH_CHART_PLAYER_NOT_ON_TEAM"
    // ✅ Step 3A extras
    | "PLAYER_NOT_FOUND"
    | "INVALID_TEAM"
    | "NO_40_MAN_SPACE"
    | "NO_26_MAN_SPACE"
    | "NEEDS_WAIVERS";
  teamId: EntityId;
  message: string;
  refs?: EntityId[];
};

export function validateRosterView(
  state: LeagueState,
  view: RosterView
): RosterViolation[] {
  const v: RosterViolation[] = [];

  if (view.active26.length > 26) {
    v.push({
      code: "ACTIVE_OVER_26",
      teamId: view.teamId,
      message: `Active roster over 26 (${view.active26.length})`,
    });
  }

  if (view.fortyMan.length > 40) {
    v.push({
      code: "FORTY_OVER_40",
      teamId: view.teamId,
      message: `40-man roster over 40 (${view.fortyMan.length})`,
    });
  }

  // Any MLB-assigned player should be on the 40-man (v1 rule)
  const teamPlayers = (Object.values(state.players) as Player[]).filter(
    (p) => p && p.teamId === view.teamId
  );

  for (const p of teamPlayers) {
    if (p.level !== "MLB") continue;
    const roster = getRosterStatus(p);
    if (!roster.on40) {
      v.push({
        code: "MLB_NOT_ON_40",
        teamId: view.teamId,
        message: `MLB player not on 40-man: ${p.name} (${p.id})`,
        refs: [p.id],
      });
    }
  }

  // Depth chart drift check (optional but extremely useful)
  const team = state.teams[view.teamId];
  if (team) {
    const depthIds = new Set<EntityId>([
      ...(team.lineup ?? []),
      ...(team.rotation ?? []),
      ...(team.bullpen ?? []),
    ]);

    const bad: EntityId[] = [];
    for (const id of depthIds) {
      const p = state.players[id];
      if (!p || p.teamId !== view.teamId) bad.push(id);
    }

    if (bad.length) {
      v.push({
        code: "DEPTH_CHART_PLAYER_NOT_ON_TEAM",
        teamId: view.teamId,
        message: `Depth chart contains players not on team (${bad.length})`,
        refs: bad.slice(0, 10),
      });
    }
  }

  return v;
}