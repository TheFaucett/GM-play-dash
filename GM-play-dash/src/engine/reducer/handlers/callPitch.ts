import type { LeagueState } from "../../types/league";
import type { CallPitchAction } from "../../actions/types";
import type {
  Pitch,
  PitchType,
  PitchLocation,
  StrikeZonePoint,
} from "../../types/pitch";
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

/* ======================================================
   FALLBACKS
====================================================== */

const FALLBACK_BATTER = {
  ratings: { contact: 50, power: 50, discipline: 50 },
};

const FALLBACK_PITCHER = {
  ratings: { stuff: 50, command: 50, movement: 50, stamina: 50 },
  fatigue: 0,
  role: "SP",
};

/* ======================================================
   HELPERS
====================================================== */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clamp01(n: number) {
  return clamp(n, 0, 1);
}

function randn(roll: () => number) {
  const u1 = clamp(roll(), 1e-12, 1 - 1e-12);
  const u2 = clamp(roll(), 1e-12, 1 - 1e-12);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function inferLegacyLocationFromY(y: number): PitchLocation {
  if (y >= 0.66) return "high";
  if (y <= 0.33) return "low";
  return "middle";
}

function fallbackTargetFromLegacy(location: PitchLocation): StrikeZonePoint {
  if (location === "high") return { x: 0.5, y: 0.78 };
  if (location === "low") return { x: 0.5, y: 0.22 };
  return { x: 0.5, y: 0.5 };
}

function isInZone(p: StrikeZonePoint): boolean {
  return p.x >= 0.1 && p.x <= 0.9 && p.y >= 0.15 && p.y <= 0.85;
}

/* ======================================================
   FATIGUE
====================================================== */

function fatigueIncrement(pitcher: any) {
  const stamina = pitcher.ratings?.stamina ?? 50;
  return 1 + (1 - stamina / 150);
}

function fatiguePenalty(fatigue: number) {
  return Math.min(fatigue / 150, 0.25);
}

function pitchFatigueGain(type: PitchType) {
  switch (type) {
    case "SL":
    case "SW":
    case "CU":
    case "KB":
      return 3.5;
    case "CH":
    case "SF":
      return 2.5;
    default:
      return 2.0;
  }
}

function pitchFatiguePenalty(f: number) {
  return clamp(f / 120, 0, 0.3);
}

/* ======================================================
   EXECUTION
====================================================== */

function computeSprayRadius(args: {
  command: number;
  movement: number;
  fatigueBias: number;
  pitchFatigueBias: number;
  intent: string;
}) {
  const base = 0.11;
  const commandFactor = 0.22 * (1 - args.command / 100);
  const movementFactor = -0.04 * (args.movement / 100);
  const fatigueFactor = 0.2 * args.fatigueBias;
  const pitchFatigueFactor = 0.25 * args.pitchFatigueBias;

  let intentFactor = 1;
  if (args.intent === "paint") intentFactor = 1.15;
  if (args.intent === "nibble") intentFactor = 1.25;
  if (args.intent === "waste") intentFactor = 1.05;

  return clamp(
    (base +
      commandFactor +
      movementFactor +
      fatigueFactor +
      pitchFatigueFactor) *
      intentFactor,
    0.02,
    0.45
  );
}

function applyExecutionError(
  target: StrikeZonePoint,
  radius: number,
  roll: () => number
): StrikeZonePoint {
  return {
    x: clamp(target.x + randn(roll) * radius, -0.35, 1.35),
    y: clamp(target.y + randn(roll) * radius, -0.35, 1.35),
  };
}

/* ======================================================
   MAIN
====================================================== */

export function handleCallPitch(
  state: LeagueState,
  action: CallPitchAction
): LeagueState {
  const halfInningId = state.pointers.halfInningId;
  if (!halfInningId) return state;

  const half = state.halfInnings[halfInningId];
  const atBatId = half?.currentAtBatId;
  if (!atBatId) return state;

  const atBat = state.atBats[atBatId];
  if (!atBat || atBat.result) return state;

  const now = Date.now();
  const pitchId = `pitch_${Object.keys(state.pitches).length}`;
  const roll = () => nextRandom(state.rng);

  let { balls, strikes } = atBat.count;
  let result: AtBatResult | undefined;
  let play: AtBatPlay | undefined;

  const batterPlayer = state.players[atBat.batterId] ?? FALLBACK_BATTER;
  const pitcherPlayer = state.players[atBat.pitcherId] ?? FALLBACK_PITCHER;

  const batter = getBatterAttributes(batterPlayer as any);
  const pitcher = getPitcherAttributes(pitcherPlayer as any);

  const fatigueBias = fatiguePenalty(pitcherPlayer.fatigue ?? 0);
  const nextFatigue = clamp(
    (pitcherPlayer.fatigue ?? 0) + fatigueIncrement(pitcherPlayer),
    0,
    100
  );

  const calledPitch = action.payload.pitchType;
  const pitchStateForPitcher =
    state.pitchState?.[atBat.pitcherId] ?? {};

  const currentPitchFatigue =
    pitchStateForPitcher[calledPitch]?.fatigue ?? 0;

  const nextPitchFatigue = clamp(
    currentPitchFatigue + pitchFatigueGain(calledPitch),
    0,
    100
  );

  const pitchFatigueBias = pitchFatiguePenalty(currentPitchFatigue);

  const payloadAny = action.payload as any;
  const target =
    payloadAny?.target?.x != null
      ? {
          x: clamp(payloadAny.target.x, 0, 1),
          y: clamp(payloadAny.target.y, 0, 1),
        }
      : fallbackTargetFromLegacy(action.payload.location);

  const legacyLocation =
    action.payload.location ?? inferLegacyLocationFromY(target.y);

  const sprayRadius = computeSprayRadius({
    command: pitcher.control,
    movement: pitcher.movement,
    fatigueBias,
    pitchFatigueBias,
    intent: action.payload.intent,
  });

  const actual = applyExecutionError(target, sprayRadius, roll);
  const inZone = isInZone(actual);

  let pitchTable = { ...BASE_PITCH_TABLE };
  pitchTable = applyCountModifiers(pitchTable, balls, strikes);
  pitchTable = applyPitchTypeModifiers(pitchTable, calledPitch);
  pitchTable = applyPitchLocationModifiers(pitchTable, legacyLocation);

  pitchTable.ball += fatigueBias;
  pitchTable.strike -= fatigueBias;

  if (!inZone) {
    const s = Math.min(pitchTable.strike, 0.22);
    pitchTable.strike -= s;
    pitchTable.ball += s;
  }

  const outcome = weightedRoll(pitchTable, roll);

  switch (outcome) {
    case "ball":
      balls++;
      break;
    case "strike":
      strikes++;
      break;
    case "foul":
      if (strikes < 2) strikes++;
      break;
    case "in_play": {
      const matchup =
        BATTER_VS_PITCH[batterPlayer.ratings?.batterArchetype as BatterArchetype]?.[
          calledPitch
        ];

      const adjustedPower =
        batter.power + (matchup?.power ?? 0) + (pitcherPlayer.fatigue ?? 0) * 0.15;

      const contactQuality = resolveContactQuality(
        adjustedPower,
        calledPitch,
        legacyLocation,
        roll
      );

      const battedBall = resolveBattedBall(batter, pitcher, roll);
      const resolved = resolveInPlay(
        half.runnerState,
        half.outs,
        battedBall,
        contactQuality,
        roll
      );

      result = resolved.result;
      play = resolved.play;
      break;
    }
  }

  if (!result) {
    if (strikes >= 3) result = "strikeout";
    else if (balls >= 4) result = "walk";
  }

  const pitch: Pitch = {
    id: pitchId,
    createdAt: now,
    updatedAt: now,
    atBatId,
    pitchType: calledPitch,
    location: legacyLocation,
    intent: action.payload.intent,
    target,
    actual,
    velocity: 95,
    movement: 50,
    result: outcome,
  };

  return {
    ...state,
    pitches: { ...state.pitches, [pitchId]: pitch },
    players: {
      ...state.players,
      [atBat.pitcherId]: {
        ...pitcherPlayer,
        fatigue: nextFatigue,
      },
    },
    pitchState: {
      ...state.pitchState,
      [atBat.pitcherId]: {
        ...pitchStateForPitcher,
        [calledPitch]: { fatigue: nextPitchFatigue },
      },
    },
    atBats: {
      ...state.atBats,
      [atBatId]: {
        ...atBat,
        count: { balls, strikes },
        pitchIds: [...atBat.pitchIds, pitchId],
        result,
        play,
      },
    },
  };
}
