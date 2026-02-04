import type { EntityId } from "./base";

/* ==============================================
   TRADE VALUE
============================================== */

/**
 * Result of evaluating a trade package.
 *
 * Positive delta = favors fromTeam
 * Negative delta = favors toTeam
 */
export type TradeValueResult = {
  fromTeamValue: number;
  toTeamValue: number;
  delta: number;

  verdict: TradeValueVerdict;
};

export type TradeValueVerdict =
  | "ACCEPT"
  | "REJECT"
  | "COUNTER";

/* ==============================================
   TRADE PROPOSALS
============================================== */

/**
 * Atomic trade proposal.
 *
 * This is NOT an executed trade.
 * It is safe for:
 * - AI inbox
 * - UI rendering
 * - Counter logic
 * - Logging
 */
export type TradeProposal = {
  id: string;

  fromTeamId: string;
  toTeamId: string;

  fromTeamPlayers: string[];
  toTeamPlayers: string[];

  evaluation: TradeValueResult;

  createdAt: number;
};

/* ==============================================
   TRADE EXECUTION (FUTURE)
============================================== */

/**
 * Executed trade record.
 * (Phase C — included here for continuity)
 */
export type ExecutedTrade = {
  id: EntityId;

  fromTeamId: EntityId;
  toTeamId: EntityId;

  fromTeamPlayers: EntityId[];
  toTeamPlayers: EntityId[];

  executedAt: number;
  seasonId: EntityId;
};
