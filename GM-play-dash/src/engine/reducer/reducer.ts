import type { LeagueState } from "../types/league";
import type { Action } from "../actions/types";
import { checkInvariants } from "../invariants/check";

// handler imports
import { handleNewLeague } from "./handlers/newLeague";
import { handleStartGame } from "./handlers/startGame";
import { handleCallPitch } from "./handlers/callPitch";
import { handleAdvanceAtBat } from "./handlers/advanceAtBat";
import { handleAdvanceHalfInning } from "./handlers/advanceHalfInning";
import { handleSimHalfInning } from "./handlers/simHalfInning";
import { handleSelectUserTeam as handleSetUserTeam } from "../sim/selectUserTeam";
import { handleReleasePlayer } from "./handlers/releasePlayer";
import { handleAcceptTradeProposal } from "./handlers/acceptTradeProposal";
import { handleOfferTradeProposal } from "./handlers/offerTradeProposal";
import { projectAllPlayers } from "../sim/derivePlayerProjections";
export function reducer(state: LeagueState, action: Action): LeagueState {
  let nextState: LeagueState;
  console.log(`[REDUCER] Action dispatched: ${action.type}`);
  switch (action.type) {
    case "NEW_LEAGUE":
      nextState = handleNewLeague(state, action);
      break;

    case "SELECT_USER_TEAM":
      nextState = handleSetUserTeam(state, action);
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
    case "SELECT_PLAYER":
      // Implement the handler when ready
      nextState = {
        ...state,
        pointers: {
            ...state.pointers,
            selectedPlayerId: action.payload.playerId,
        },
        };
      break;
    //one shot
    case "PROJECT_ALL_PLAYERS":
      console.log("[REDUCER] PROJECT_ALL_PLAYERS fired");
      nextState = {
        ...projectAllPlayers(state),
      };
      break;
    
    /* ---------------------------------------------
       TRADES
    --------------------------------------------- */

    case "OFFER_TRADE_PROPOSAL":
      console.log("[REDUCER] OFFER_TRADE_PROPOSAL fired");
      nextState = handleOfferTradeProposal(state, action.payload);
      break;

    case "ACCEPT_TRADE_PROPOSAL":
      nextState = handleAcceptTradeProposal(state, action.payload);
      break;

    case "REJECT_TRADE_PROPOSAL":
      // Implement the handler when ready
      nextState = state;
      break;
    case "RELEASE_PLAYER":
      nextState = handleReleasePlayer(state, action.payload);
      break;

    default: {
      const _exhaustive: never = action;
      return state;
    }
  }

  // Optional invariant checks later
  // checkInvariants(nextState);

  return nextState;
}
