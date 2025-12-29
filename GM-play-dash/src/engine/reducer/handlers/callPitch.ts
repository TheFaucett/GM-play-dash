// src/engine/reducer/handlers/callPitch.ts
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

/* ----------------------------------------------
   FALLBACK PLAYERS (ENGINE-SAFE)
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
    stuff: 50,
    command: 50,
    movement: 50,
    stamina: 50,
  },
  fatigue: 0,
  role: "SP",
};

/* ----------------------------------------------
   SMALL MATH HELPERS
---------------------------------------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Box-Muller transform using your rng roll() to approximate normal noise.
 * Returns a ~N(0, 1) sample.
 */
function randn(roll: () => number): number {
  const u1 = clamp(roll(), 1e-12, 1 - 1e-12);
  const u2 = clamp(roll(), 1e-12, 1 - 1e-12);
  const mag = Math.sqrt(-2.0 * Math.log(u1));
  return mag * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Legacy location is still used by your existing modifiers.
 * We infer it from y (higher = "high", lower = "low").
 */
function inferLegacyLocationFromY(y: number): PitchLocation {
  if (y >= 0.66) return "high";
  if (y <= 0.33) return "low";
  return "middle";
}

/**
 * If older UI is still calling with { location: "high|middle|low" },
 * pick reasonable center targets for those bands.
 */
function fallbackTargetFromLegacy(location: PitchLocation): StrikeZonePoint {
  if (location === "high") return { x: 0.5, y: 0.78 };
  if (location === "low") return { x: 0.5, y: 0.22 };
  return { x: 0.5, y: 0.5 };
}

/**
 * Strike zone test.
 * This is NOT a perfect "MLB zone" — it’s an engine-friendly first pass.
 * (You can swap this later with batter-zone, framing, umpire, etc.)
 */
function isInZone(p: StrikeZonePoint): boolean {
  // Slightly inset rectangle feels better than full [0..1]
  const left = 0.1;
  const right = 0.9;
  const bottom = 0.15;
  const top = 0.85;

  return p.x >= left && p.x <= right && p.y >= bottom && p.y <= top;
}

/* ----------------------------------------------
   FATIGUE HELPERS
---------------------------------------------- */

function fatigueIncrement(pitcher: any): number {
  const stamina = pitcher.ratings?.stamina ?? 50;

  // Lower stamina = faster fatigue
  const base = 1.0;
  const staminaFactor = 1 - stamina / 150; // ~0.33 at 50 stamina

  return base + staminaFactor;
}

function fatiguePenalty(fatigue: number): number {
  // Caps at ~25% distortion
  return Math.min(fatigue / 150, 0.25);
}

/**
 * Converts pitcher + intent + fatigue into a "spray radius" in zone units.
 * Bigger radius = more likely to miss the click.
 */
function computeCommandSprayRadius(args: {
  command: number;
  movement: number;
  fatigueBias: number;
  intent: string;
}): number {
  const command = clamp(args.command ?? 50, 0, 100);
  const movement = clamp(args.movement ?? 50, 0, 100);

  // Baseline miss for an average pitcher
  const base = 0.11;

  // Command reduces spray strongly
  const commandFactor = 0.22 * (1 - command / 100);

  // Movement slightly reduces spray (optional design choice)
  const movementFactor = -0.04 * (movement / 100);

  // Fatigue expands spray
  const fatigueFactor = 0.20 * args.fatigueBias;

  // Intent multiplies difficulty
  let intentFactor = 1.0;
  if (args.intent === "paint") intentFactor = 1.15;
  if (args.intent === "nibble") intentFactor = 1.25;
  if (args.intent === "waste") intentFactor = 1.05;

  const radius = (base + commandFactor + movementFactor + fatigueFactor) * intentFactor;

  return clamp(radius, 0.02, 0.40);
}

/**
 * Given an intended target, apply execution error to produce the actual location.
 * Allows landing outside the zone so balls can be "way off".
 */
function applyExecutionError(
  target: StrikeZonePoint,
  sprayRadius: number,
  roll: () => number
): StrikeZonePoint {
  const dx = randn(roll) * sprayRadius;
  const dy = randn(roll) * sprayRadius;

  return {
    x: clamp(target.x + dx, -0.35, 1.35),
    y: clamp(target.y + dy, -0.35, 1.35),
  };
}

/* ==============================================
   HANDLE CALL PITCH (CLICK ZONE + COMMAND MISS)
============================================== */
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
     BATTER (WITH FALLBACK)
     ===================================================== */

  const batterPlayer =
    state.players[atBat.batterId] ?? FALLBACK_BATTER;
  const batter = getBatterAttributes(batterPlayer as any);

  /* =====================================================
     PITCHER + FATIGUE
     ===================================================== */

  const pitcherPlayer =
    state.players[atBat.pitcherId] ?? FALLBACK_PITCHER;
  const pitcher = getPitcherAttributes(pitcherPlayer as any);

  const currentFatigue = pitcherPlayer.fatigue ?? 0;
  const fatigueGain = fatigueIncrement(pitcherPlayer);
  const nextFatigue = Math.min(100, currentFatigue + fatigueGain);
  const fatigueBias = fatiguePenalty(currentFatigue);

  /* =====================================================
     TARGET PICK (NEW: strike-zone click)
     Back-compat: if payload has only location, convert to a default target.
     ===================================================== */

  const payloadAny = action.payload as any;

  const target: StrikeZonePoint =
    payloadAny?.target &&
    typeof payloadAny.target.x === "number" &&
    typeof payloadAny.target.y === "number"
      ? {
          x: clamp(payloadAny.target.x, 0, 1),
          y: clamp(payloadAny.target.y, 0, 1),
        }
      : fallbackTargetFromLegacy(action.payload.location);

  // Legacy location still drives your existing pitch/batter mods.
  // This represents the *intended* vertical band.
  const legacyLocation: PitchLocation =
    action.payload.location ?? inferLegacyLocationFromY(target.y);

  /* =====================================================
     EXECUTION (NEW)
     ===================================================== */

  const sprayRadius = computeCommandSprayRadius({
    command: (pitcher as any).command ?? 50, // ✅ use command (not control)
    movement: (pitcher as any).movement ?? 50,
    fatigueBias,
    intent: action.payload.intent,
  });

  const actual = applyExecutionError(target, sprayRadius, roll);
  const inZone = isInZone(actual);

  /* =====================================================
     BATTER DECISION
     (Still uses intent/target band for now to preserve your existing behavior.)
     ===================================================== */

  const decision = decideBatterAction(
    batter.discipline,
    balls,
    strikes,
    legacyLocation,
    roll
  );

  /* =====================================================
     BUILD PITCH TABLE (FATIGUE + EXECUTION)
     ===================================================== */

  let pitchTable = BASE_PITCH_TABLE;

  pitchTable = applyCountModifiers(pitchTable, balls, strikes);
  pitchTable = applyPitchTypeModifiers(
    pitchTable,
    action.payload.pitchType as PitchType
  );
  pitchTable = applyPitchLocationModifiers(
    pitchTable,
    legacyLocation
  );

  // 🔻 Fatigue hurts control
  pitchTable.ball += fatigueBias;
  pitchTable.strike -= fatigueBias;

  // ✅ Execution bias: if pitch missed the zone, convert some strike probability into ball.
  if (!inZone) {
    const missShift = 0.22;
    const shift = Math.min(pitchTable.strike, missShift);
    pitchTable.strike -= shift;
    pitchTable.ball += shift;
  } else {
    // small reward for being in zone
    const hitShift = 0.06;
    const shift = Math.min(pitchTable.ball, hitShift);
    pitchTable.ball -= shift;
    pitchTable.strike += shift;
  }

  // Normalize
  const total =
    pitchTable.ball +
    pitchTable.strike +
    pitchTable.foul +
    pitchTable.in_play;

  pitchTable.ball /= total;
  pitchTable.strike /= total;
  pitchTable.foul /= total;
  pitchTable.in_play /= total;

  // Batter takes: collapse into ball/strike only
  if (decision === "take") {
    pitchTable = {
      ball: pitchTable.ball + pitchTable.foul + pitchTable.in_play,
      strike: pitchTable.strike,
      foul: 0,
      in_play: 0,
    };

    const t = pitchTable.ball + pitchTable.strike;
    pitchTable.ball /= t;
    pitchTable.strike /= t;
  }

  /* =====================================================
     ROLL PITCH
     ===================================================== */

  const pitchOutcome = weightedRoll(pitchTable, roll);
  const pitchResult: Pitch["result"] = pitchOutcome;

  /* =====================================================
     APPLY OUTCOME
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

      // fatigue boosts hitter power (your prior rule)
      const adjustedPower =
        batter.power + (matchup?.power ?? 0) + currentFatigue * 0.15;

      const contactQuality = resolveContactQuality(
        adjustedPower,
        action.payload.pitchType,
        legacyLocation,
        roll
      );

      const battedBall = resolveBattedBall(batter, pitcher, roll);

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
     COUNT RESOLUTION
     ===================================================== */

  if (!result) {
    if (strikes >= 3) result = "strikeout";
    else if (balls >= 4) result = "walk";
  }

  /* =====================================================
     WRITE STATE
     ===================================================== */

  const pitch: Pitch = {
    id: pitchId,
    createdAt: now,
    updatedAt: now,
    atBatId,

    pitchType: action.payload.pitchType,
    location: legacyLocation,
    intent: action.payload.intent,

    // ✅ New: intended & actual location
    // (Make sure Pitch type supports these fields.)
    target,
    actual,

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

    players: {
      ...state.players,
      ...(state.players[atBat.pitcherId]
        ? {
            [atBat.pitcherId]: {
              ...pitcherPlayer,
              fatigue: nextFatigue,
            },
          }
        : {}),
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
