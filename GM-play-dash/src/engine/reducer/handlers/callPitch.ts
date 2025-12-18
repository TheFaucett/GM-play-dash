import type { LeagueState } from "../../types/league";
import type { CallPitchAction } from "../../actions/types";
import type { Pitch } from "../../types/pitch";
import type { AtBatResult } from "../../types/atBat";

import { weightedRoll } from "../../sim/weightedRoll";
import { decideBatterAction } from "../../sim/batterDecision";
import { nextRandom } from "../../sim/rng";

import { BASE_PITCH_TABLE } from "../../sim/pitchOutcomeTable";
import { applyCountModifiers } from "../../sim/applyCountModifier";
import { applyPitchTypeModifiers } from "../../sim/pitchTypeModifiers";
import { applyPitchLocationModifiers } from "../../sim/pitchLocationModifiers";

import { BASE_BATTING_TABLE } from "../../sim/battingTable";
import { applyBattingModifiers } from "../../sim/applyBattingModifiers";
import {
  getBatterAttributes,
  getPitcherAttributes,
} from "../../sim/deriveAttributes";

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

  let balls = atBat.count.balls;
  let strikes = atBat.count.strikes;
  let result: AtBatResult | undefined;

  const roll = () => nextRandom(state.rng);

  // -------------------------------------------------
  // Batter decision (Step 15)
  // -------------------------------------------------
  const batterPlayer = state.players[atBat.batterId];
  if (!batterPlayer) return state;

  const batter = getBatterAttributes(batterPlayer);

  const decision = decideBatterAction(
    batter.discipline,
    balls,
    strikes,
    action.payload.location,
    roll
  );

  // -------------------------------------------------
  // Build pitch outcome table
  // -------------------------------------------------
  let pitchTable = BASE_PITCH_TABLE;

  pitchTable = applyCountModifiers(
    pitchTable,
    balls,
    strikes
  );

  pitchTable = applyPitchTypeModifiers(
    pitchTable,
    action.payload.pitchType
  );

  pitchTable = applyPitchLocationModifiers(
    pitchTable,
    action.payload.location
  );

  // -------------------------------------------------
  // If batter TAKES, restrict outcomes
  // -------------------------------------------------
  if (decision === "take") {
    pitchTable = {
      ball:
        pitchTable.ball +
        pitchTable.foul +
        pitchTable.in_play,
      strike: pitchTable.strike,
      foul: 0,
      in_play: 0,
    };

    const total = pitchTable.ball + pitchTable.strike;
    pitchTable.ball /= total;
    pitchTable.strike /= total;
  }

  // -------------------------------------------------
  // Roll pitch outcome
  // -------------------------------------------------
  const pitchOutcome = weightedRoll(pitchTable, roll);
  let pitchResult: Pitch["result"] = pitchOutcome;

  // -------------------------------------------------
  // Apply pitch outcome
  // -------------------------------------------------
  switch (pitchOutcome) {
    case "ball":
      balls = Math.min(4, balls + 1);
      break;

    case "strike":
      strikes = Math.min(3, strikes + 1);
      break;

    case "foul":
      if (strikes < 2) strikes += 1;
      break;

    case "in_play": {
      const pitcherPlayer = state.players[atBat.pitcherId];
      if (!pitcherPlayer) return state;

      const pitcher = getPitcherAttributes(pitcherPlayer);

      const battingTable = applyBattingModifiers(
        BASE_BATTING_TABLE,
        batter,
        pitcher,
        action.payload.intent
      );

      const outcome = weightedRoll(battingTable, roll);
      result = outcome === "out" ? "out" : outcome;
      break;
    }
  }

  // -------------------------------------------------
  // Count-based resolution
  // -------------------------------------------------
  if (!result) {
    if (strikes >= 3) {
      result = "strikeout";
    } else if (balls >= 4) {
      result = "walk";
    }
  }

  // -------------------------------------------------
  // Record pitch + update at-bat
  // -------------------------------------------------
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

    rng: {
      ...state.rng,
    },

    log: [
      ...state.log,
      {
        id: `log_${state.log.length}`,
        timestamp: now,
        type: "PITCH",
        description: `${decision} → ${pitchOutcome}`,
        refs: [pitchId, atBatId],
      },
    ],
  };
}
