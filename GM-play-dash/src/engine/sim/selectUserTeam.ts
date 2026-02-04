import type { LeagueState } from "../types/league";
import type { SelectUserTeamAction } from "../actions/types";

export function handleSelectUserTeam(
  state: LeagueState,
  action: SelectUserTeamAction
): LeagueState {
  return {
    ...state,

    meta: {
      ...state.meta,
      userTeamId: action.payload.teamId,
    },

    // 🔒 CRITICAL: preserve navigation state
    pointers: {
      ...state.pointers,
    },

    // 🔒 also preserve intent maps (same invariant class)
    playerIntent: {
      ...state.playerIntent,
    },
    teamIntent: {
      ...state.teamIntent,
    },
  };
}

