import type { PitchIntent, PitchType, PitchLocation } from "../types/pitch";
import type { EntityId } from "../types/base";

import type { OfferTradeProposalPayload } from "../reducer/handlers/offerTradeProposal";

/* -------------------------------------------------
 * Union of all engine actions
 * ------------------------------------------------- */

export type Action =
  | NewLeagueAction
  | StartGameAction
  | SelectUserTeamAction
  | AcceptTradeProposalAction
  | RejectTradeProposalAction
  | OfferTradeProposalAction
  | CallPitchAction
  | AdvanceAtBatAction
  | AdvanceHalfInningAction
  | SimHalfInningAction
  | SelectPlayerAction
  | ReleasePlayerAction
  | ProjectAllPlayersAction
  | SignFreeAgentAction
  | RosterMoveAction // ✅ NEW
  | MakeFreeAgentOfferAction
  | NormalizeContractUnitsAction;

export type ProjectAllPlayersAction = {
  type: "PROJECT_ALL_PLAYERS";
};

/* -------------------------------------------------
 * Roster ops (Step 3 UI hook)
 * ------------------------------------------------- */

export type RosterMove =
  | { type: "ADD_TO_40"; playerId: EntityId }
  | { type: "REMOVE_FROM_40"; playerId: EntityId }
  | { type: "PROMOTE_TO_MLB"; playerId: EntityId }
  | { type: "DEMOTE_TO_AAA"; playerId: EntityId };

/**
 * UI / dev tools can dispatch this to apply roster moves via `applyRosterMove`.
 * This keeps roster logic centralized in the roster primitive.
 */
export type RosterMoveAction = {
  type: "ROSTER_MOVE";
  payload: {
    move: RosterMove;
  };
};

/* -------------------------------------------------
 * League / Game lifecycle
 * ------------------------------------------------- */

export type NewLeagueAction = {
  type: "NEW_LEAGUE";
  payload: {
    seed: number;
    year: number;
  };
};

export type StartGameAction = {
  type: "START_GAME";
  payload: {
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    gameId: string;
  };
};

export type SelectUserTeamAction = {
  type: "SELECT_USER_TEAM";
  payload: {
    teamId: string;
  };
};

export type SignFreeAgentAction = {
  type: "SIGN_FREE_AGENT";
  payload: {
    playerId: string;
    toTeamId: string;
  };
};

/* -------------------------------------------------
 * Trades
 * ------------------------------------------------- */

export type AcceptTradeProposalAction = {
  type: "ACCEPT_TRADE_PROPOSAL";
  payload: {
    proposalId: string;
    toTeamId: EntityId;
  };
};

export type RejectTradeProposalAction = {
  type: "REJECT_TRADE_PROPOSAL";
  payload: {
    toTeamId: EntityId;
    proposalId: EntityId;
  };
};

export type OfferTradeProposalAction = {
  type: "OFFER_TRADE_PROPOSAL";
  payload: OfferTradeProposalPayload;
};

/* -------------------------------------------------
 * Pitch-by-pitch gameplay
 * ------------------------------------------------- */

export type CallPitchAction = {
  type: "CALL_PITCH";
  payload: {
    pitchType: PitchType;
    location: PitchLocation;
    intent: PitchIntent;
  };
};

/* -------------------------------------------------
 * Flow control
 * ------------------------------------------------- */

export type AdvanceAtBatAction = {
  type: "ADVANCE_AT_BAT";
};

export type AdvanceHalfInningAction = {
  type: "ADVANCE_HALF_INNING";
};

export type SimHalfInningAction = {
  type: "SIM_HALF_INNING";
};
export type NormalizeContractUnitsAction = {
  type: "NORMALIZE_CONTRACT_UNITS";
};
export type SelectPlayerAction = {
  type: "SELECT_PLAYER";
  payload: {
    playerId: EntityId | null;
  };
};

export type ReleasePlayerAction = {
  type: "RELEASE_PLAYER";
  payload: {
    playerId: EntityId;
  };
};
export type MakeFreeAgentOfferAction = {
  type: "MAKE_FA_OFFER";
  payload: {
    playerId: EntityId;
    toTeamId: EntityId;
    years: number;
    aav: number; // annual salary
    targetLevel?: "AAA" | "MLB"; // default AAA
    addTo40?: boolean; // default false; if MLB target, you probably set true
  };
};