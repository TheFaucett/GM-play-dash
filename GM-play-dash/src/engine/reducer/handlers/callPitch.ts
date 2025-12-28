import type { LeagueState } from "../../types/league";
import type { CallPitchAction } from "../../actions/types";
import type { Pitch, PitchType } from "../../types/pitch";
import type { AtBatResult, AtBatPlay } from "../../types/atBat";
import type { BatterArchetype } from "../../types/playerArchetypes";

import { weightedRoll } from "../../sim/weightedRoll";
import { decideBatterAction } from "../../sim/batterDecision";
import { nextRandom } from "../../sim/rng";

import { BASE_PITCH_TABLE } from "../../sim/pitchOutcomeTable";
import { applyCountModifiers } from "../../sim/applyCountModifier";
import { applyPitchTypeModifiers } from "../../sim/pitchTypeModifiers";
import { applyPitchLocationModifiers } from "../../sim/pitchLocationModifiers";

import {
  getBatterAttributes,
  getPitcherAttributes,
} from "../../sim/deriveAttributes";

import { resolveBattedBall } from "../../sim/resolveBattedBall";
import { resolveContactQuality } from "../../sim/resolveContactQuality";
import { resolveInPlay } from "../../sim/resolveInPlay";

import { BATTER_VS_PITCH } from "../../sim/matchups/batterVsPitch";

/* ----------------------------------------------
   FALLBACK ATTRIBUTES (OPTION A)
---------------------------------------------- */

const FALLBACK_BATTER = {
  ratings: {
    contact: 50,
    power: 50,
    discipline: 50,
    batterArchetype: undefined,
  },
};

const FALLBACK_PITCHER = {
  ratings: {
    velocity: 50,
    movement: 50,
    control: 50,
  },
};

export function handleCallPitch(
  state: LeagueState,
  action: CallPitchAction
): LeagueState {
  const { halfInningId } = state.pointers;
  if (!halfInningId) return state;

  const halfInning = state.halfInnings[halfInningId];
  if (!halfInning?.currentAtBatId) return state;

  const atBatId = halfInning.currentAtBatId;
  const atBat = state.atBats[atBatId];

  if (!atBat || atBat.result || (atBat as any).resolvedAt) return state;

  const now = Date.now();
  const pitchId = `pitch_${Object.keys(state.pitches).length}`;

  let balls = atBat.count.balls;
  let strikes = atBat.count.strikes;
  let result: AtBatResult | undefined;
  let play: AtBatPlay | undefined;

  const roll = () => nextRandom(state.rng);

  /* =====================================================
     BATTER DECISION (WITH FALLBACK)
     ===================================================== */

  const batterPlayer =
    state.players[atBat.batterId] ?? FALLBACK_BATTER;

  const batter = getBatterAttributes(
    batterPlayer as any
  );

  const decision = decideBatterAction(
    batter.discipline,
    balls,
    strikes,
    action.payload.location,
    roll
  );

  /* =====================================================
     BUILD PITCH OUTCOME TABLE
     ===================================================== */

  let pitchTable = BASE_PITCH_TABLE;

  pitchTable = applyCountModifiers(pitchTable, balls, strikes);
  pitchTable = applyPitchTypeModifiers(
    pitchTable,
    action.payload.pitchType as PitchType
  );
  pitchTable = applyPitchLocationModifiers(
    pitchTable,
    action.payload.location
  );

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

  /* =====================================================
     ROLL PITCH OUTCOME
     ===================================================== */

  const pitchOutcome = weightedRoll(pitchTable, roll);
  const pitchResult: Pitch["result"] = pitchOutcome;

  /* =====================================================
     APPLY PITCH OUTCOME
     ===================================================== */

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
      const pitcherPlayer =
        state.players[atBat.pitcherId] ?? FALLBACK_PITCHER;

      const pitcher = getPitcherAttributes(
        pitcherPlayer as any
      );

      const batterArchetype =
        batterPlayer.ratings.batterArchetype as
          | BatterArchetype
          | undefined;

      const matchup =
        batterArchetype
          ? BATTER_VS_PITCH[batterArchetype]?.[
              action.payload.pitchType as PitchType
            ]
          : undefined;

      const adjustedPower =
        batter.power + (matchup?.power ?? 0);

      const contactQuality = resolveContactQuality(
        adjustedPower,
        action.payload.pitchType,
        action.payload.location,
        roll
      );

      const battedBall = resolveBattedBall(
        batter,
        pitcher,
        roll
      );

      const resolved = resolveInPlay(
        halfInning.runnerState,
        halfInning.outs,
        battedBall,
        contactQuality,
        roll
      );

      result = resolved.result;
      play = resolved.play;
      break;
    }
  }

  /* =====================================================
     COUNT-BASED RESOLUTION
     ===================================================== */

  if (!result) {
    if (strikes >= 3) result = "strikeout";
    else if (balls >= 4) result = "walk";
  }

  /* =====================================================
     RECORD PITCH + UPDATE AT-BAT
     ===================================================== */

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

  return {
    ...state,

    pitches: {
      ...state.pitches,
      [pitchId]: pitch,
    },

    atBats: {
      ...state.atBats,
      [atBatId]: {
        ...atBat,
        updatedAt: now,
        count: { balls, strikes },
        pitchIds: [...atBat.pitchIds, pitchId],
        result,
        play,
      },
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
        description:
          pitchOutcome === "in_play"
            ? `${decision} → in_play (${result})`
            : `${decision} → ${pitchOutcome}`,
        refs: [pitchId, atBatId],
      },
    ],
  };
}
