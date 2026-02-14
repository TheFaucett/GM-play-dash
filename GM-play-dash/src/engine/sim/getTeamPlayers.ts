import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Player } from "../types/player";

/**
 * Single source of truth for team rosters.
 * DO NOT reimplement this logic elsewhere.
 */
export function getTeamPlayers(
  state: LeagueState,
  teamId: EntityId
): Player[] {
  return Object.values(state.players).filter(
    (p) => p.teamId === teamId
  );
}
