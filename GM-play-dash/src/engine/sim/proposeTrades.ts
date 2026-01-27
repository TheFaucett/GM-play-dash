// src/engine/trade/proposeTrades.ts

import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import { evaluateTradeCandidates } from "./evaluateTradeCandidates";
import type { TradeCandidate } from "./evaluateTradeCandidates";


/* ==============================================
   TYPES
============================================== */

export type TradeProposal = {
  fromTeamId: EntityId;
  toTeamId: EntityId;
  outgoingPlayerId: EntityId;
  incomingPlayerId: EntityId;
  score: number; // higher = more appealing
  reason: string;
};

/* ==============================================
   MAIN ENTRY
============================================== */

export function proposeTrades(
  state: LeagueState
): TradeProposal[] {
  const proposals: TradeProposal[] = [];

  const candidates = evaluateTradeCandidates(state);

  // Group candidates by selling team
  const sellers = groupByTeam(candidates);

  for (const [sellerTeamId, sellerCandidates] of Object.entries(
    sellers
  )) {
    const sellerIntent = state.teamIntent[sellerTeamId];
    if (!sellerIntent) continue;

    // Only rebuild / pressured teams actively sell
    if (sellerIntent.direction !== "REBUILD") continue;

    for (const candidate of sellerCandidates) {
      const buyer = findBuyer(state, sellerTeamId);
      if (!buyer) continue;

      const incomingPlayerId =
        pickReturnPlayer(state, buyer);

      if (!incomingPlayerId) continue;

      const score = scoreTrade(
        state,
        candidate,
        buyer
      );

      proposals.push({
        fromTeamId: sellerTeamId as EntityId,
        toTeamId: buyer,
        outgoingPlayerId: candidate.playerId,
        incomingPlayerId,
        score,
        reason: candidate.reasons.join(", "),
      });
    }
  }

  return proposals.sort(
    (a, b) => b.score - a.score
  );
}

/* ==============================================
   HELPERS
============================================== */

function groupByTeam(
  candidates: TradeCandidate[]
): Record<string, TradeCandidate[]> {
  const map: Record<string, TradeCandidate[]> = {};
  for (const c of candidates) {
    if (!map[c.teamId]) map[c.teamId] = [];
    map[c.teamId].push(c);
  }
  return map;
}

function findBuyer(
  state: LeagueState,
  sellerTeamId: string
): EntityId | null {
  for (const [teamId, intent] of Object.entries(
    state.teamIntent
  )) {
    if (teamId === sellerTeamId) continue;
    if (intent.direction === "REBUILD") continue;
    return teamId as EntityId;
  }
  return null;
}

function pickReturnPlayer(
  state: LeagueState,
  teamId: EntityId
): EntityId | null {
  const players = Object.values(state.players).filter(
    (p) => p.teamId === teamId
  );

  // Extremely naive: return any non-CL player
  const candidate = players.find(
    (p) => p.role !== "CL"
  );

  return candidate?.id ?? null;
}

function scoreTrade(
  state: LeagueState,
  candidate: TradeCandidate,
  buyerTeamId: EntityId
): number {
  let score = candidate.urgency;

  const buyerIntent =
    state.teamIntent[buyerTeamId];

  if (buyerIntent?.direction === "CONTEND") {
    score += 15;
  }

  return Math.min(score, 100);
}
