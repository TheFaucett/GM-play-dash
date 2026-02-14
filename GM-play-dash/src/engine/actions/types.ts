import type { PitchIntent, PitchType, PitchLocation } from "../types/pitch";
import type { EntityId } from "../types/base";

import type {
  OfferTradeProposalPayload,
} from "../reducer/handlers/offerTradeProposal";

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
  | SelectPlayerAction;

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
export type SelectPlayerAction = {
  type: "SELECT_PLAYER";
  payload: {
    playerId: EntityId | null;
  };
};