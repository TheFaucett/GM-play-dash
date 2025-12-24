import type { LeagueState } from "../types/league";
import type { Action } from "../actions/types";
import { checkInvariants } from "../invariants/check";

//handler imports
import { handleNewLeague } from "./handlers/newLeague";
import { handleStartGame } from "./handlers/startGame";
import { handleCallPitch } from "./handlers/callPitch";
import { handleAdvanceAtBat } from "./handlers/advanceAtBat";
import { handleAdvanceHalfInning } from "./handlers/advanceHalfInning";
import { handleSimHalfInning } from "./handlers/simHalfInning";


export function reducer(
  state: LeagueState,
  action: Action
): LeagueState {
  let nextState: LeagueState;

  switch (action.type) {
    case "NEW_LEAGUE":
      nextState = handleNewLeague(state, action);
      break;

    case "START_GAME":
      nextState = handleStartGame(state, action);
      break;

    case "CALL_PITCH":
      nextState = handleCallPitch(state, action);
      break;

    case "ADVANCE_AT_BAT":
      nextState = handleAdvanceAtBat(state);
      break;

    case "ADVANCE_HALF_INNING":
      nextState = handleAdvanceHalfInning(state);
      break;

    case "SIM_HALF_INNING":
      console.log("[REDUCER] SIM_HALF_INNING fired");
      nextState = handleSimHalfInning(state);
      break;

    default: {
      const _exhaustive: never = action;
      return state;
    }
  }

 // if (process.env.NODE_ENV !== "production") {
//    checkInvariants(nextState);
//  }

  return nextState;
}
