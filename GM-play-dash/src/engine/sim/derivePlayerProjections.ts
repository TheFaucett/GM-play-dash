// src/engine/sim/derivePlayerProjections.ts
//
// Purpose:
// - Produce *projection* baseball lines from the same attribute layer your pitch sim uses.
// - These are NOT historical stats; they’re expected rates / per-600PA (batters) and per-IP (pitchers).
//
// Design notes:
// - Projections should be deterministic. Your current deriveAttributes.ts uses noise() with Math.random().
//   For projections, we intentionally DO NOT call that noise. We re-derive attributes deterministically
//   from latents/ratings using the same weights but with noise = 0.
//
// - This fits pitch-by-pitch mode because both systems share the same conceptual bridge:
//   latents -> attributes -> outcome probabilities.
//   (Pitch mode uses attributes to resolve events; projections use attributes to summarize expected outcomes.)

import type { LeagueState } from "../types/league";
import type { Player, PlayerRole } from "../types/player";
import type { EntityId } from "../types/base";
import type {
  PlayerLatents,
  BatterLatents,
  PitcherLatents,
} from "../types/playerLatents";
import type {
  BatterArchetype,
  PitcherArchetype,
} from "../types/playerArchetypes";

/* ======================================================
   TYPES
====================================================== */

export type PlayerProjection = {
  version: 1;
  asOfYear?: number;

  // For UI sorting / quick glance
  role: PlayerRole;

  // Batters: per 600 PA
  batting?: {
    pa: number; // baseline (e.g., 600)
    AB: number;
    H: number;
    "2B": number;
    "3B": number;
    HR: number;
    BB: number;
    SO: number;

    AVG: number;
    OBP: number;
    SLG: number;
    OPS: number;

    BBpct: number; // 0..1
    Kpct: number; // 0..1
    HRpct: number; // HR / PA
    BABIP: number; // hits in play / balls in play
  };

  // Pitchers: baseline IP depends on role
  pitching?: {
    ip: number; // baseline (e.g., 180 SP, 60 RP/CL)
    BF: number; // batters faced approximation
    H: number;
    BB: number;
    SO: number;
    HR: number;

    ERA: number;
    WHIP: number;
    K9: number;
    BB9: number;
    HR9: number;

    Kpct: number;
    BBpct: number;
    HRpct: number;
    BABIP: number;
  };
};

/* ======================================================
   CONSTANTS / HELPERS
====================================================== */

const DEFAULT_RATING = 50;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round(n: number) {
  return Math.round(n);
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function safeNum(n: unknown, fallback = 0): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function t(v: unknown, scale = 1): number {
  return typeof v === "number" ? v * scale : 0;
}

// Maps a 0..100 attribute to a small probability shift
function scale01(attr: number, slope: number) {
  return (attr - 50) * slope;
}

/* ======================================================
   DETERMINISTIC ATTRIBUTE DERIVATION (NO NOISE)
   Mirrors your deriveAttributes.ts, minus noise().
====================================================== */

export type BatterAttributes = {
  contact: number;
  power: number;
  discipline: number;
  vision: number;
};

export type PitcherAttributes = {
  stuff: number;
  control: number;
  movement: number;
  stamina: number;
};

function clampRating(v: number): number {
  return clamp(Math.round(v), 0, 100);
}

export function getBatterAttributesDeterministic(player: Player): BatterAttributes {
  const r = player.ratings;

  const latents = player.latents as PlayerLatents | undefined;
  const common = latents?.common;
  const batter = latents?.batter as BatterLatents | undefined;

  const archetype: BatterArchetype | undefined = r.batterArchetype;

  // Optional soft tendencies (same as your file)
  const tendencies = (player as any)?.tendencies?.batter ?? {};

  let contact =
    batter && common
      ? batter.handEye * 0.6 + batter.plateVision * 0.3 + common.consistency * 0.1
      : safeNum(r.contact, DEFAULT_RATING);

  let power =
    batter && common
      ? batter.batSpeed * 0.7 + batter.liftBias * 0.2 + common.athleticism * 0.1
      : safeNum(r.power, DEFAULT_RATING);

  let discipline =
    batter && common
      ? batter.plateVision * 0.6 + (100 - batter.aggression) * 0.25 + common.consistency * 0.15
      : safeNum(r.discipline, DEFAULT_RATING);

  let vision =
    batter && common
      ? batter.plateVision * 0.7 + common.consistency * 0.3
      : safeNum(r.vision, DEFAULT_RATING);

  // tendency bias
  power += t(tendencies.pullHappy, 0.12);
  power += t(tendencies.huntsFastball, 0.10);

  discipline += t(tendencies.takesFirstPitch, 0.18);
  discipline -= t(tendencies.sellOutPower, 0.20);

  contact += t(tendencies.twoStrikeProtect, 0.15);
  power -= t(tendencies.twoStrikeProtect, 0.12);

  // archetype flavor
  switch (archetype) {
    case "contact_hitter":
      contact += 15;
      discipline += 8;
      vision += 6;
      power -= 10;
      break;
    case "three_true_outcomes":
      power += 16;
      discipline += 12;
      contact -= 14;
      vision -= 6;
      break;
    case "speedy":
      contact += 10;
      vision += 8;
      discipline += 4;
      power -= 16;
      break;
    case "power_slugger":
      power += 20;
      contact -= 10;
      discipline -= 6;
      vision -= 8;
      break;
    default:
      break;
  }

  return {
    contact: clampRating(contact),
    power: clampRating(power),
    discipline: clampRating(discipline),
    vision: clampRating(vision),
  };
}

export function getPitcherAttributesDeterministic(player: Player): PitcherAttributes {
  const r = player.ratings;

  const latents = player.latents as PlayerLatents | undefined;
  const common = latents?.common;
  const pitcher = latents?.pitcher as PitcherLatents | undefined;

  const archetype: PitcherArchetype | undefined = r.pitcherArchetype;

  const tendencies = (player as any)?.tendencies?.pitcher ?? {};

  let stuff =
    pitcher && common
      ? pitcher.armStrength * 0.6 + pitcher.movementAbility * 0.25 + common.athleticism * 0.15
      : safeNum(r.stuff, DEFAULT_RATING);

  let control =
    pitcher && common
      ? pitcher.releaseConsistency * 0.6 + pitcher.commandFocus * 0.25 + common.consistency * 0.15
      : safeNum(r.command, DEFAULT_RATING);

  let movement =
    pitcher
      ? pitcher.movementAbility * 0.75
      : safeNum(r.movement, DEFAULT_RATING);

  let stamina =
    pitcher && common
      ? pitcher.fatigueResistance * 0.7 + common.consistency * 0.3
      : safeNum(r.stamina, DEFAULT_RATING);

  // tendency bias
  control += t(tendencies.pitchToContact, 0.20);
  movement += t(tendencies.chaseHeavy, 0.18);

  stuff += t(tendencies.fastballBias, 0.14);
  control -= t(tendencies.fastballBias, 0.10);

  control += t(tendencies.firstPitchStrikeBias, 0.16);

  // archetype flavor
  switch (archetype) {
    case "power_ace":
      stuff += 20;
      stamina += 8;
      control -= 6;
      movement -= 4;
      break;
    case "control_artist":
      control += 18;
      movement += 6;
      stuff -= 10;
      stamina += 4;
      break;
    case "soft_toss_lefty":
      movement += 16;
      control += 6;
      stuff -= 18;
      stamina += 6;
      break;
    case "groundball_specialist":
      movement += 20;
      control += 6;
      stuff -= 12;
      break;
    case "wild_fireballer":
      stuff += 22;
      movement += 6;
      control -= 18;
      stamina -= 4;
      break;
    default:
      break;
  }

  return {
    stuff: clampRating(stuff),
    control: clampRating(control),
    movement: clampRating(movement),
    stamina: clampRating(stamina),
  };
}

/* ======================================================
   RATE MODELS (PROJECTION)
   These are “league-context” transforms.
   You can tune constants later without touching sim logic.
====================================================== */

// Baselines (rough MLB-ish)
const LEAGUE = {
  BBpct: 0.08,
  Kpct: 0.23,
  HRpct: 0.03,
  BABIP: 0.295,
  // for pitchers
  ERA: 4.20,
  PA_PER_INNING: 4.3,
};

function batterRatesFromAttributes(a: BatterAttributes) {
  // Walk rate: discipline/vision drive it upward
  const BBpct = clamp(
    LEAGUE.BBpct + scale01(a.discipline, 0.0010) + scale01(a.vision, 0.0005),
    0.03,
    0.18
  );

  // K rate: contact/vision reduce K; low discipline slightly increases chase Ks
  const Kpct = clamp(
    LEAGUE.Kpct - scale01(a.contact, 0.0014) - scale01(a.vision, 0.0004) + scale01(100 - a.discipline, 0.0003),
    0.08,
    0.38
  );

  // HR rate: power drives it strongly; contact helps a bit (more balls put in air in play)
  const HRpct = clamp(
    LEAGUE.HRpct + scale01(a.power, 0.00055) + scale01(a.contact, 0.00008),
    0.006,
    0.085
  );

  // BABIP: contact pushes it up a bit (better quality + placement)
  const BABIP = clamp(
    LEAGUE.BABIP + scale01(a.contact, 0.0006),
    0.23,
    0.36
  );

  return { BBpct, Kpct, HRpct, BABIP };
}

function pitcherRatesFromAttributes(a: PitcherAttributes) {
  // Pitcher K%: stuff + movement drive Ks; control slightly reduces Ks (more in-zone contact)
  const Kpct = clamp(
    LEAGUE.Kpct + scale01(a.stuff, 0.0012) + scale01(a.movement, 0.0006) - scale01(a.control, 0.00025),
    0.12,
    0.40
  );

  // BB%: control drives it down
  const BBpct = clamp(
    LEAGUE.BBpct - scale01(a.control, 0.0011),
    0.03,
    0.16
  );

  // HR% allowed: movement/stuff suppress it
  const HRpct = clamp(
    LEAGUE.HRpct - scale01(a.movement, 0.00030) - scale01(a.stuff, 0.00015),
    0.012,
    0.070
  );

  // BABIP allowed: movement suppresses
  const BABIP = clamp(
    LEAGUE.BABIP - scale01(a.movement, 0.00045),
    0.245,
    0.340
  );

  // ERA projection: component-ish adjustment around league baseline
  const ERA = clamp(
    LEAGUE.ERA - scale01(a.stuff, 0.025) - scale01(a.control, 0.020) - scale01(a.movement, 0.020),
    1.50,
    7.50
  );

  return { BBpct, Kpct, HRpct, BABIP, ERA };
}

/* ======================================================
   PROJECTION BUILDERS
====================================================== */

export function projectBatter(player: Player, pa = 600): PlayerProjection["batting"] {
  const a = getBatterAttributesDeterministic(player);
  const rates = batterRatesFromAttributes(a);

  const BB = round(pa * rates.BBpct);
  const SO = round(pa * rates.Kpct);
  const HR = round(pa * rates.HRpct);

  // Balls in play exclude BB, SO, HR (HR treated separately for simplicity)
  const ballsInPlay = Math.max(0, pa - BB - SO - HR);
  const hitsInPlay = round(ballsInPlay * rates.BABIP);

  // Total hits
  const H = hitsInPlay + HR;

  // Approx extra-base mix from power
  // Of non-HR hits: some become 2B/3B.
  const nonHRHits = Math.max(0, H - HR);
  const xbhShare = clamp(0.28 + scale01(a.power, 0.0022), 0.12, 0.55);
  const XBH = round(nonHRHits * xbhShare);

  const triplesShare = 0.04; // small constant for now
  const _3B = round(XBH * triplesShare);
  const _2B = Math.max(0, XBH - _3B);

  const _1B = Math.max(0, nonHRHits - _2B - _3B);

  const AB = Math.max(0, pa - BB); // ignoring HBP/SF for v1

  const AVG = AB > 0 ? H / AB : 0;
  const OBP = pa > 0 ? (H + BB) / pa : 0;
  const totalBases = _1B + 2 * _2B + 3 * _3B + 4 * HR;
  const SLG = AB > 0 ? totalBases / AB : 0;
  const OPS = OBP + SLG;

  return {
    pa,
    AB,
    H,
    "2B": _2B,
    "3B": _3B,
    HR,
    BB,
    SO,
    AVG: round3(AVG),
    OBP: round3(OBP),
    SLG: round3(SLG),
    OPS: round3(OPS),
    BBpct: round3(rates.BBpct),
    Kpct: round3(rates.Kpct),
    HRpct: round3(rates.HRpct),
    BABIP: round3(rates.BABIP),
  };
}

export function projectPitcher(
  player: Player,
  ipBaseline?: number
): PlayerProjection["pitching"] {
  const a = getPitcherAttributesDeterministic(player);
  const rates = pitcherRatesFromAttributes(a);

  const ip =
    typeof ipBaseline === "number"
      ? ipBaseline
      : player.role === "SP"
      ? 180
      : 60;

  const BF = round(ip * LEAGUE.PA_PER_INNING);

  const BB = round(BF * rates.BBpct);
  const SO = round(BF * rates.Kpct);
  const HR = round(BF * rates.HRpct);

  const ballsInPlay = Math.max(0, BF - BB - SO - HR);
  const hitsInPlay = round(ballsInPlay * rates.BABIP);
  const H = hitsInPlay + HR;

  const ERA = round3(rates.ERA);
  const ER = (ERA * ip) / 9;

  const WHIP = ip > 0 ? (BB + H) / ip : 0;

  const K9 = ip > 0 ? (SO * 9) / ip : 0;
  const BB9 = ip > 0 ? (BB * 9) / ip : 0;
  const HR9 = ip > 0 ? (HR * 9) / ip : 0;

  return {
    ip,
    BF,
    H,
    BB,
    SO,
    HR,
    ERA,
    WHIP: round3(WHIP),
    K9: round3(K9),
    BB9: round3(BB9),
    HR9: round3(HR9),
    Kpct: round3(rates.Kpct),
    BBpct: round3(rates.BBpct),
    HRpct: round3(rates.HRpct),
    BABIP: round3(rates.BABIP),
  };
}

export function derivePlayerProjection(player: Player, asOfYear?: number): PlayerProjection {
  const proj: PlayerProjection = {
    version: 1,
    asOfYear,
    role: player.role,
  };

  if (player.role === "BAT") {
    proj.batting = projectBatter(player, 600);
  } else {
    // pitchers: give both pitching baseline and (optional) a small batting projection later for two-way
    proj.pitching = projectPitcher(player);
  }

  return proj;
}

/* ======================================================
   APPLY TO STATE
====================================================== */

export function projectAllPlayers(state: LeagueState): LeagueState {
  const seasonId = state.pointers.seasonId;
  const season = seasonId ? state.seasons[seasonId] : undefined;
  const asOfYear = season?.year;

  const nextPlayers: LeagueState["players"] = { ...state.players };

  for (const [playerId, player] of Object.entries(state.players)) {
    // Only project real players (skip FA sentinel if you have one)
    const p = player as Player;

    // Attach as derived cache (similar to player.value)
    (nextPlayers as any)[playerId] = {
      ...p,
      projection: derivePlayerProjection(p, asOfYear),
    };
  }

  return {
    ...state,
    players: nextPlayers,
  };
}