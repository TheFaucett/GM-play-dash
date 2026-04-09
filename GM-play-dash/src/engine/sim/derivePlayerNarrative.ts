// src/engine/sim/derivePlayerNarrative.ts
//
// Purpose:
// - Generate a short, baseball-flavored paragraph + tags for a player based on:
//   (a) season totals
//   (b) checkpoint splits (second half / last 30 days)
//   (c) projection (optional context)
// - Deterministic, derived, safe to recompute anytime.
//
// Assumptions / compatibility:
// - Uses season.narrativeCache from accumulateSeasonStats.ts (batter/pitcher checkpoints).
// - Batting season totals currently include: G, AB, H, R, RBI, BB, SO (+ optional HR).
// - Pitching totals are optional: only works if you’re accumulating `season.seasonStats.pitchers`
//   and/or boxScore.pitching checkpoints exist.
// - If some stats don’t exist, we fall back to “approach” narratives (BB/K/AVG) for batters.

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Player } from "../types/player";

import type { PlayerProjection } from "./derivePlayerProjections";

/* ======================================================
   TYPES
====================================================== */

export type PlayerNarrative = {
  version: 1;
  asOfYear?: number;
  asOfDay?: number;

  headline: string;      // short label
  bullets: string[];     // tags/signal bullets
  paragraph: string;     // 1–3 sentences
  confidence: number;    // 0..1 strength of signals

  // Debug-friendly: what stats drove it (optional)
  debug?: Record<string, number | string | null | undefined>;
};

type BatterTotals = {
  playerId: EntityId;
  G: number;
  AB: number;
  H: number;
  R: number;
  RBI: number;
  BB: number;
  SO: number;
  HR?: number;
};

type PitcherTotals = {
  playerId: EntityId;
  G: number;
  IP: number;
  ER: number;
  H: number;
  BB: number;
  SO: number;
  HR?: number;
};

type BatterCheckpoint = BatterTotals & { day: number };
type PitcherCheckpoint = PitcherTotals & { day: number };

type NarrativeCache = {
  batterCheckpointsByPlayerId?: Record<EntityId, BatterCheckpoint[]>;
  pitcherCheckpointsByPlayerId?: Record<EntityId, PitcherCheckpoint[]>;
};

/* ======================================================
   HELPERS
====================================================== */

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeDiv(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function fmt3(n: number) {
  return round3(n).toFixed(3);
}

function pct(n: number) {
  return `${Math.round(n * 1000) / 10}%`;
}

function getSeasonContext(state: LeagueState, seasonId: EntityId) {
  const season = state.seasons[seasonId];
  if (!season) return null;

  const asOfYear = (season as any).year as number | undefined;
  const asOfDay =
    typeof (season as any).day === "number" ? ((season as any).day as number) : 0;

  const cache = (season as any).narrativeCache as NarrativeCache | undefined;

  return {
    season,
    asOfYear,
    asOfDay,
    cache,
  };
}

function getProjection(player: Player): PlayerProjection | null {
  const p = player as unknown as { projection?: PlayerProjection };
  return p.projection ?? null;
}

function getCheckpointAtOrBefore<T extends { day: number }>(
  checkpoints: T[] | undefined,
  day: number
): T | null {
  if (!checkpoints || checkpoints.length === 0) return null;

  // assume checkpoints are appended in day order
  let best: T | null = null;
  for (const ck of checkpoints) {
    if (ck.day <= day) best = ck;
    else break;
  }
  return best ?? checkpoints[0] ?? null;
}

function diffBatter(a: BatterCheckpoint, b: BatterCheckpoint): BatterTotals {
  // returns b - a (a is earlier snapshot)
  const d: BatterTotals = {
    playerId: b.playerId,
    G: b.G - a.G,
    AB: b.AB - a.AB,
    H: b.H - a.H,
    R: b.R - a.R,
    RBI: b.RBI - a.RBI,
    BB: b.BB - a.BB,
    SO: b.SO - a.SO,
  };
  if (typeof b.HR === "number" && typeof a.HR === "number") {
    d.HR = b.HR - a.HR;
  }
  return d;
}

function diffPitcher(a: PitcherCheckpoint, b: PitcherCheckpoint): PitcherTotals {
  const d: PitcherTotals = {
    playerId: b.playerId,
    G: b.G - a.G,
    IP: b.IP - a.IP,
    ER: b.ER - a.ER,
    H: b.H - a.H,
    BB: b.BB - a.BB,
    SO: b.SO - a.SO,
  };
  if (typeof b.HR === "number" && typeof a.HR === "number") {
    d.HR = b.HR - a.HR;
  }
  return d;
}

function battingRates(t: BatterTotals) {
  const PA = t.AB + t.BB; // ignoring HBP/SF (fine for narrative)
  const AVG = safeDiv(t.H, t.AB);
  const OBP = safeDiv(t.H + t.BB, PA);
  const BBpct = safeDiv(t.BB, PA);
  const Kpct = safeDiv(t.SO, PA);
  const HR = typeof t.HR === "number" ? t.HR : 0;
  const HRpct = safeDiv(HR, PA);

  return { PA, AVG, OBP, BBpct, Kpct, HR, HRpct };
}

function pitchingRates(t: PitcherTotals) {
  const ERA = safeDiv(t.ER * 9, t.IP);
  const WHIP = safeDiv(t.BB + t.H, t.IP);
  const K9 = safeDiv(t.SO * 9, t.IP);
  const BB9 = safeDiv(t.BB * 9, t.IP);
  const HR = typeof t.HR === "number" ? t.HR : 0;
  const HR9 = safeDiv(HR * 9, t.IP);

  // if you don’t track BF, use BB+H+SO as a rough proxy
  const BF = t.BB + t.H + t.SO;
  const Kpct = safeDiv(t.SO, BF);
  const BBpct = safeDiv(t.BB, BF);
  const HRpct = safeDiv(HR, BF);

  return { ERA, WHIP, K9, BB9, HR9, BF, Kpct, BBpct, HRpct, HR };
}

/* ======================================================
   SIGNALS (v1)
====================================================== */

function buildBatterNarrative(args: {
  player: Player;
  totals: BatterTotals | null;
  last30: BatterTotals | null;
  secondHalf: BatterTotals | null;
  proj: PlayerProjection | null;
  asOfYear?: number;
  asOfDay?: number;
}): PlayerNarrative {
  const { player, totals, last30, secondHalf, proj, asOfYear, asOfDay } = args;

  // Safety fallback if we somehow have nothing
  if (!totals) {
    return {
      version: 1,
      asOfYear,
      asOfDay,
      headline: "Limited data",
      bullets: ["No season line available"],
      paragraph:
        "Not enough season-level data to generate a meaningful scouting blurb yet.",
      confidence: 0.1,
    };
  }

  const rFull = battingRates(totals);
  const r30 = last30 ? battingRates(last30) : null;
  const r2H = secondHalf ? battingRates(secondHalf) : null;

  const bullets: string[] = [];
  let confidence = 0.25;

  // Main “shape” signals
  const bbGood = rFull.BBpct >= 0.095;
  const kBad = rFull.Kpct >= 0.27;
  const kElite = rFull.Kpct <= 0.18;

  if (bbGood) {
    bullets.push(`Disciplined (${pct(rFull.BBpct)} BB%)`);
    confidence += 0.12;
  }
  if (kElite) {
    bullets.push(`High-contact (${pct(rFull.Kpct)} K%)`);
    confidence += 0.12;
  } else if (kBad) {
    bullets.push(`Whiff risk (${pct(rFull.Kpct)} K%)`);
    confidence += 0.10;
  }

  // HR context if you track it
  if (typeof totals.HR === "number") {
    if (rFull.HRpct >= 0.05) {
      bullets.push(`Power output (HR% ${pct(rFull.HRpct)})`);
      confidence += 0.10;
    } else if (rFull.HRpct <= 0.015) {
      bullets.push("Limited over-the-fence power");
      confidence += 0.06;
    }
  }

  // Hot / cold second half
  let headline = "Steady season profile";
  if (r2H && r2H.PA >= 120) {
    const obpJump = r2H.OBP - rFull.OBP;
    const kDelta = r2H.Kpct - rFull.Kpct;
    const bbDelta = r2H.BBpct - rFull.BBpct;

    if (obpJump >= 0.030 && kDelta <= -0.020) {
      headline = "Hot second half surge";
      bullets.push("Strong second half finish");
      confidence += 0.18;
    } else if (obpJump <= -0.030 && kDelta >= 0.020) {
      headline = "Late-season fade";
      bullets.push("Second half regression");
      confidence += 0.16;
    }

    // Specific approach changes
    if (bbDelta >= 0.020) {
      bullets.push("Improved patience late");
      confidence += 0.10;
    }
    if (kDelta <= -0.025) {
      bullets.push("Tightened swing decisions");
      confidence += 0.10;
    }
  }

  // Last 30 days as “recent form”
  let recentLine = "";
  if (r30 && r30.PA >= 60) {
    const hot = r30.OBP - rFull.OBP >= 0.040;
    const cold = rFull.OBP - r30.OBP >= 0.040;

    if (hot) {
      bullets.push("Hot recently (last 30 days)");
      confidence += 0.10;
    } else if (cold) {
      bullets.push("Cold recently (last 30 days)");
      confidence += 0.08;
    }

    recentLine = ` Recently: ${fmt3(r30.AVG)}/${fmt3(r30.OBP)} in the last ~30 days.`;
  }

  // Projection expectation context
  let expectation = "";
  if (proj?.batting) {
    const pOBP = proj.batting.OBP;
    const delta = rFull.OBP - pOBP;
    if (delta >= 0.020) {
      bullets.push("Outperformed projection");
      confidence += 0.08;
      expectation = " He outperformed the projection baseline, especially in getting on base.";
    } else if (delta <= -0.020) {
      bullets.push("Underperformed projection");
      confidence += 0.08;
      expectation = " The on-base output came in below the projection baseline, suggesting room for a bounceback if the approach stabilizes.";
    }
  }

  // Compose paragraph (1–3 sentences, baseball-y)
  const base =
    `Season line: ${fmt3(rFull.AVG)}/${fmt3(rFull.OBP)} ` +
    `with ${pct(rFull.BBpct)} BB% and ${pct(rFull.Kpct)} K%.`;

  let styleSentence = "";
  if (bbGood && !kBad) {
    styleSentence =
      " The approach is mature—works counts, keeps the ball in play enough, and should age well.";
  } else if (bbGood && kBad) {
    styleSentence =
      " The patience is real, but the swing-and-miss keeps the floor volatile—he’ll need damage or favorable contact quality to sustain value.";
  } else if (!bbGood && kElite) {
    styleSentence =
      " It’s a contact-driven profile—less walk-based value, more dependent on batting average and situational hitting.";
  } else if (kBad) {
    styleSentence =
      " It’s a power/variance shape: when the timing is right he can carry an offense, but cold stretches will come with elevated strikeouts.";
  } else {
    styleSentence =
      " Overall it reads as a balanced bat with outcomes driven by marginal changes in contact quality and decision-making.";
  }

  const paragraph = (base + styleSentence + recentLine + expectation).trim();

  return {
    version: 1,
    asOfYear,
    asOfDay,
    headline,
    bullets: bullets.slice(0, 6),
    paragraph,
    confidence: clamp(confidence, 0.1, 1),
    debug: {
      PA: rFull.PA,
      AVG: round3(rFull.AVG),
      OBP: round3(rFull.OBP),
      BBpct: round3(rFull.BBpct),
      Kpct: round3(rFull.Kpct),
      ...(typeof totals.HR === "number" ? { HR: totals.HR } : null),
      ...(r2H ? { OBP_2H: round3(r2H.OBP) } : null),
      ...(r30 ? { OBP_30: round3(r30.OBP) } : null),
    },
  };
}

function buildPitcherNarrative(args: {
  player: Player;
  totals: PitcherTotals | null;
  last30: PitcherTotals | null;
  secondHalf: PitcherTotals | null;
  proj: PlayerProjection | null;
  asOfYear?: number;
  asOfDay?: number;
}): PlayerNarrative {
  const { totals, last30, secondHalf, proj, asOfYear, asOfDay } = args;

  if (!totals || totals.IP <= 5) {
    return {
      version: 1,
      asOfYear,
      asOfDay,
      headline: "Limited data",
      bullets: ["No meaningful workload yet"],
      paragraph:
        "Not enough pitching workload has accumulated to generate a reliable scouting blurb.",
      confidence: 0.15,
    };
  }

  const rFull = pitchingRates(totals);
  const r30 = last30 ? pitchingRates(last30) : null;
  const r2H = secondHalf ? pitchingRates(secondHalf) : null;

  const bullets: string[] = [];
  let confidence = 0.28;

  // Shape signals
  const kPlus = rFull.K9 >= 9.5 || rFull.Kpct >= 0.24;
  const bbBad = rFull.BB9 >= 3.8 || rFull.BBpct >= 0.10;
  const hrBad = rFull.HR9 >= 1.4;

  if (kPlus) {
    bullets.push(`Misses bats (K/9 ${rFull.K9.toFixed(1)})`);
    confidence += 0.12;
  } else {
    bullets.push(`Pitch-to-contact (K/9 ${rFull.K9.toFixed(1)})`);
    confidence += 0.06;
  }

  if (bbBad) {
    bullets.push(`Walk risk (BB/9 ${rFull.BB9.toFixed(1)})`);
    confidence += 0.10;
  } else {
    bullets.push(`Command stable (BB/9 ${rFull.BB9.toFixed(1)})`);
    confidence += 0.08;
  }

  if (hrBad) {
    bullets.push(`HR problem (HR/9 ${rFull.HR9.toFixed(1)})`);
    confidence += 0.08;
  }

  // Second half trend
  let headline = "Rotation / relief stability";
  if (r2H && secondHalf && secondHalf.IP >= 15) {
    const eraDelta = r2H.ERA - rFull.ERA;
    const bbDelta = r2H.BB9 - rFull.BB9;
    const kDelta = r2H.K9 - rFull.K9;

    if (eraDelta <= -0.60 && kDelta >= 0.6) {
      headline = "Strong second half finish";
      bullets.push("Trending up late");
      confidence += 0.16;
    } else if (eraDelta >= 0.75 && bbDelta >= 0.6) {
      headline = "Late-season volatility";
      bullets.push("Command slipped late");
      confidence += 0.16;
    }
  }

  // Recent form
  let recentLine = "";
  if (r30 && last30 && last30.IP >= 8) {
    if (r30.ERA <= rFull.ERA - 0.75) {
      bullets.push("Hot recently");
      confidence += 0.08;
    } else if (r30.ERA >= rFull.ERA + 1.0) {
      bullets.push("Rough recent stretch");
      confidence += 0.08;
    }
    recentLine = ` Recently: ${r30.ERA.toFixed(2)} ERA over ~last 30 days.`;
  }

  // Projection context
  let expectation = "";
  if (proj?.pitching) {
    const pERA = proj.pitching.ERA;
    const delta = rFull.ERA - pERA;
    if (delta <= -0.30) {
      bullets.push("Outperformed projection");
      confidence += 0.07;
      expectation = " Results came in better than projection, especially in run prevention.";
    } else if (delta >= 0.35) {
      bullets.push("Underperformed projection");
      confidence += 0.07;
      expectation =
        " Results lagged the projection baseline—worth checking whether it was HR-driven variance or a real command issue.";
    }
  }

  const base =
    `Season: ${rFull.ERA.toFixed(2)} ERA, ` +
    `WHIP ${rFull.WHIP.toFixed(2)}, ` +
    `K/9 ${rFull.K9.toFixed(1)}, BB/9 ${rFull.BB9.toFixed(1)}.`;

  let styleSentence = "";
  if (kPlus && !bbBad && !hrBad) {
    styleSentence =
      " This is a bat-missing profile with enough strike throwing to hold up—good bet to sustain leverage or mid-rotation value.";
  } else if (kPlus && bbBad) {
    styleSentence =
      " The stuff plays, but the walks create volatility—when he falls behind, the inning gets loud quickly.";
  } else if (!kPlus && !bbBad) {
    styleSentence =
      " More contact-oriented, but the command keeps him on schedule; value will come from weak contact and avoiding big innings.";
  } else if (hrBad) {
    styleSentence =
      " The main red flag is the long ball—cleaner sequencing and better location are the path to a meaningful step forward.";
  } else {
    styleSentence =
      " Overall it’s a workable arm whose value swings with small changes in strike throwing and contact quality.";
  }

  const paragraph = (base + " " + styleSentence + recentLine + expectation).trim();

  return {
    version: 1,
    asOfYear,
    asOfDay,
    headline,
    bullets: bullets.slice(0, 6),
    paragraph,
    confidence: clamp(confidence, 0.1, 1),
    debug: {
      IP: round3(totals.IP),
      ERA: round3(rFull.ERA),
      WHIP: round3(rFull.WHIP),
      K9: round3(rFull.K9),
      BB9: round3(rFull.BB9),
      HR9: round3(rFull.HR9),
      ...(r2H ? { ERA_2H: round3(r2H.ERA) } : null),
      ...(r30 ? { ERA_30: round3(r30.ERA) } : null),
    },
  };
}

/* ======================================================
   PUBLIC API
====================================================== */

export function derivePlayerNarrative(state: LeagueState, seasonId: EntityId, playerId: EntityId): PlayerNarrative {
  const ctx = getSeasonContext(state, seasonId);
  if (!ctx) {
    return {
      version: 1,
      headline: "Limited data",
      bullets: ["Season not found"],
      paragraph: "No season context exists for this narrative.",
      confidence: 0.1,
    };
  }

  const player = state.players[playerId] as Player | undefined;
  if (!player) {
    return {
      version: 1,
      asOfYear: ctx.asOfYear,
      asOfDay: ctx.asOfDay,
      headline: "Limited data",
      bullets: ["Player not found"],
      paragraph: "No player entity exists for this narrative.",
      confidence: 0.1,
    };
  }

  const proj = getProjection(player);

  const cache = ctx.cache;
  const batCk =
    cache?.batterCheckpointsByPlayerId?.[playerId] ?? null;
  const pitCk =
    cache?.pitcherCheckpointsByPlayerId?.[playerId] ?? null;

  const batTotals =
    (ctx.season.seasonStats.batters?.[playerId] as any as BatterTotals | undefined) ??
    null;

  const pitTotals =
    ((ctx.season.seasonStats as any).pitchers?.[playerId] as PitcherTotals | undefined) ??
    null;

  // Choose split anchors:
  // - second half: day 81 onward (MLB-ish). If your season length differs, adjust.
  // - last 30 days: day - 30
  const dayNow = ctx.asOfDay ?? 0;
  const day30 = Math.max(0, dayNow - 30);
  const dayHalf = 81;

  // Bat splits
  let batLast30: BatterTotals | null = null;
  let batSecondHalf: BatterTotals | null = null;

  if (batCk && batCk.length > 0) {
    const end = batCk[batCk.length - 1];
    const start30 = getCheckpointAtOrBefore(batCk, day30);
    const startHalf = getCheckpointAtOrBefore(batCk, dayHalf);

    if (start30) batLast30 = diffBatter(start30, end);
    if (startHalf) batSecondHalf = diffBatter(startHalf, end);
  }

  // Pitch splits
  let pitLast30: PitcherTotals | null = null;
  let pitSecondHalf: PitcherTotals | null = null;

  if (pitCk && pitCk.length > 0) {
    const end = pitCk[pitCk.length - 1];
    const start30 = getCheckpointAtOrBefore(pitCk, day30);
    const startHalf = getCheckpointAtOrBefore(pitCk, dayHalf);

    if (start30) pitLast30 = diffPitcher(start30, end);
    if (startHalf) pitSecondHalf = diffPitcher(startHalf, end);
  }

  // Role-gated: if you’re a BAT, don’t use pitching narrative even if stray data exists.
  if (player.role === "BAT") {
    return buildBatterNarrative({
      player,
      totals: batTotals,
      last30: batLast30,
      secondHalf: batSecondHalf,
      proj,
      asOfYear: ctx.asOfYear,
      asOfDay: ctx.asOfDay,
    });
  }

  return buildPitcherNarrative({
    player,
    totals: pitTotals,
    last30: pitLast30,
    secondHalf: pitSecondHalf,
    proj,
    asOfYear: ctx.asOfYear,
    asOfDay: ctx.asOfDay,
  });
}

/**
 * Convenience: derive narratives for a list (useful for a “storylines” board).
 * This is still derived; you can call it on demand in UI.
 */
export function deriveNarrativesForPlayers(
  state: LeagueState,
  seasonId: EntityId,
  playerIds: EntityId[]
): Record<EntityId, PlayerNarrative> {
  const out: Record<EntityId, PlayerNarrative> = {};
  for (const id of playerIds) out[id] = derivePlayerNarrative(state, seasonId, id);
  return out;
}