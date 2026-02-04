import type { EntityId } from "./base";
import type { TradeValueResult } from "./tradeProposal";

/* ==============================================
   TRADE CORE TYPES (PHASE B)
============================================== */

/**
 * One proposed trade between two teams.
 *
 * Stored in the receiving team's inbox.
 */
export type TradeProposal = {
  id: EntityId;

  /** Team initiating the trade */
  fromTeamId: EntityId;

  /** Team receiving the proposal */
  toTeamId: EntityId;

  /** Players offered by fromTeam */
  fromTeamPlayers: EntityId[];

  /** Players requested from toTeam */
  toTeamPlayers: EntityId[];

  /** Value delta from fromTeam's POV */
  delta: number;

  /** Verdict at creation time */
  verdict: "ACCEPT" | "COUNTER" | "REJECT";

  /** Creation metadata */
  createdAt: number;
  evaluation: TradeValueResult;
  /** Optional expiration (Phase C) */
  expiresAt?: number;
};

/**
 * Trade inbox keyed by receiving team.
 */
export type TradeInbox = Record<
  EntityId,
  TradeProposal[]
>;
