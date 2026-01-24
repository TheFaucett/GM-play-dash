import type { LeagueState } from "../types/league";
import type { SelectTeamAction } from "../actions/types";

export function handleSelectUserTeam(
  state: LeagueState,
  action: SelectTeamAction
): LeagueState {
  const { teamId } = action.payload;

  if (!state.teams[teamId]) {
    console.warn("❌ Tried to select invalid team:", teamId);
    return state;
  }

  return {
    ...state,
    pointers: {
      ...state.pointers,
      userTeamId: teamId,
    },
    log: [
      ...state.log,
      {
        id: `log_${state.log.length}`,
        timestamp: Date.now(),
        type: "SELECT_TEAM",
        description: `User selected team ${state.teams[teamId].name}`,
        refs: [teamId],
      },
    ],
  };
}
