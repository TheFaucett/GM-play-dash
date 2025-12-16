import type { EntityId } from "../types/base";
import type { PitchIntent } from "../types/pitch";

export type Action =
  | NewLeagueAction
  | StartGameAction
  | CallPitchAction
  | AdvanceAtBatAction
  | AdvanceHalfInningAction;

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
    seasonId: EntityId;
    homeTeamId: EntityId;
    awayTeamId: EntityId;
  };
};

export type CallPitchAction = {
  type: "CALL_PITCH";
  payload: {
    pitchType: string;
    location: string;
    intent: PitchIntent;
  };
};

export type AdvanceAtBatAction = {
  type: "ADVANCE_AT_BAT";
};

export type AdvanceHalfInningAction = {
  type: "ADVANCE_HALF_INNING";
};
