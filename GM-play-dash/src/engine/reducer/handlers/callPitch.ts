import type { LeagueState } from "../../types/league";
import type { CallPitchAction } from "../../actions/types";
import type { Pitch } from "../../types/pitch";
import type { AtBatResult } from "../../types/atBat";

export function handleCallPitch(
  state: LeagueState,
  action: CallPitchAction
): LeagueState {
  const atBatId = state.pointers.atBatId;
  if (!atBatId) return state;

  const atBat = state.atBats[atBatId];
  if (!atBat || atBat.result) return state;

  const now = Date.now();
  const pitchId = `pitch_${Object.keys(state.pitches).length}`;

  // ---- TEMP deterministic outcome (Step 7.3) ----
  const isStrike = true;

  const pitchResult: Pitch["result"] =
    isStrike ? "strike" : "ball";

  const pitch: Pitch = {
    id: pitchId,
    createdAt: now,
    updatedAt: now,
    atBatId,
    pitchType: action.payload.pitchType,
    location: action.payload.location,
    intent: action.payload.intent,
    velocity: 95,
    movement: 50,
    result: pitchResult,
  };

  let balls = atBat.count.balls;
  let strikes = atBat.count.strikes;
  let result: AtBatResult | undefined = atBat.result;

  if (pitchResult === "strike") {
    strikes = Math.min(3, strikes + 1);
  } else {
    balls = Math.min(4, balls + 1);
  }

  // ---- Resolve at-bat if limits reached ----
  if (strikes >= 3) {
    result = "strikeout";
  } else if (balls >= 4) {
    result = "walk";
  }

  const updatedAtBat = {
    ...atBat,
    updatedAt: now,
    count: { balls, strikes },
    pitchIds: [...atBat.pitchIds, pitchId],
    result,
  };

  return {
    ...state,

    pitches: {
      ...state.pitches,
      [pitchId]: pitch,
    },

    atBats: {
      ...state.atBats,
      [atBatId]: updatedAtBat,
    },

    log: [
      ...state.log,
      {
        id: `log_${state.log.length}`,
        timestamp: now,
        type: "PITCH",
        description:
          pitchResult === "strike" ? "Called strike" : "Ball",
        refs: [pitchId, atBatId],
      },
    ],
  };
}
