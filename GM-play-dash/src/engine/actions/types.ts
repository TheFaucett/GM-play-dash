import type { EntityId } from "../types/base";
import type {
  PitchIntent,
  PitchType,
  PitchLocation,
} from "../types/pitch";

/* -------------------------------------------------
 * Union of all engine actions
 * ------------------------------------------------- */
export type Action =
  | NewLeagueAction
  | StartGameAction
  | CallPitchAction
  | AdvanceAtBatAction
  | AdvanceHalfInningAction
  | SimHalfInningAction;
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

    gameId: string
  };
};

export type SelectTeamAction = {
  type: "SELECT_USER_TEAM";
  payload: {
    teamId: string;
  };
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
