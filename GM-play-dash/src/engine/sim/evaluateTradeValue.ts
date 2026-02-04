// src/engine/sim/evaluateTradeValue.ts

import type { Player } from "../types/player";

/* =============================================
   TYPES
============================================= */

export type TradeValueVerdict =
  | "ACCEPT"
  | "REJECT"
  | "COUNTER";

export type TradeValueResult = {
  fromTeamValue: number;
  toTeamValue: number;
  delta: number;

  /**
   * Positive delta = favors fromTeam
   * Negative delta = favors toTeam
   */
  verdict: TradeValueVerdict;
};

/* =============================================
   CONFIG (TUNABLE)
============================================= */

/**
 * Max value imbalance allowed before rejection.
 * Example:
 * - 0.15 = 15% overpay tolerance
 */
const MAX_IMBALANCE_RATIO = 0.15;

/**
 * Small trades get more leniency
 */
const SMALL_TRADE_FLOOR = 5;

/* =============================================
   MAIN
============================================= */

/**
 * Evaluates trade fairness using Player.value.total.
 *
 * HARD GUARANTEES:
 * - Pure
 * - Deterministic
 * - No state access
 * - Safe for UI + AI + reducer use
 */
export function evaluateTradeValue(args: {
  fromTeamPlayers: Player[];
  toTeamPlayers: Player[];
}): TradeValueResult {
  const fromTeamValue = sumTotalValue(args.fromTeamPlayers);
  const toTeamValue = sumTotalValue(args.toTeamPlayers);

  const delta = fromTeamValue - toTeamValue;

  const verdict = decideVerdict(
    fromTeamValue,
    toTeamValue,
    delta
  );

  return {
    fromTeamValue,
    toTeamValue,
    delta,
    verdict,
  };
}

/* =============================================
   HELPERS
============================================= */

function sumTotalValue(players: Player[]): number {
  return players.reduce((sum, p) => {
    // Defensive: value may be missing during dev / legacy states
    const v = p.value?.total ?? 0;
    return sum + v;
  }, 0);
}

function decideVerdict(
  fromValue: number,
  toValue: number,
  delta: number
): TradeValueVerdict {
  const absDelta = Math.abs(delta);

  // Tiny trades → always accept
  if (
    fromValue < SMALL_TRADE_FLOOR &&
    toValue < SMALL_TRADE_FLOOR
  ) {
    return "ACCEPT";
  }

  const base = Math.max(fromValue, toValue);

  // Safety: avoid divide-by-zero
  if (base === 0) {
    return "ACCEPT";
  }

  const ratio = absDelta / base;

  if (ratio <= MAX_IMBALANCE_RATIO) {
    return "ACCEPT";
  }

  // Slight overpay → counter later
  if (ratio <= MAX_IMBALANCE_RATIO * 1.5) {
    return "COUNTER";
  }

  return "REJECT";
}
