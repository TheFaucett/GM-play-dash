// src/engine/reducer/handlers/generateTradeInbox.ts

import type { LeagueState } from "../../types/league";
import type { TradeProposal } from "../../types/trade";
import type { EntityId } from "../../types/base";

import { evaluateTradeForTeam } from "../../sim/evaluateTradeForTeam";

/**
 * Generates fresh trade proposals for all teams.
 *
 * HARD GUARANTEES:
 * - Pure reducer
 * - Overwrites previous inbox
 * - Deterministic for same state
 *
 * PHASE B2:
 * - AI → AI trades only
 * - Each team pair evaluated ONCE
 * - No back-and-forth mirror trades
 */
export function handleGenerateTradeInbox(
  state: LeagueState
): LeagueState {
  const now = Date.now();

  /* --------------------------------------------
     1️⃣ INITIALIZE EMPTY INBOX
  -------------------------------------------- */

  const nextInbox: Record<EntityId, TradeProposal[]> = {};

  for (const team of Object.values(state.teams)) {
    nextInbox[team.id] = [];
  }

  const teams = Object.values(state.teams);

  /* --------------------------------------------
     2️⃣ GENERATE UNIQUE PAIR PROPOSALS
  -------------------------------------------- */

  for (let i = 0; i < teams.length; i++) {
    const fromTeam = teams[i];

    // Skip user team initiating trades (Phase B2 rule)
    if (fromTeam.id === state.meta.userTeamId) continue;

    for (let j = i + 1; j < teams.length; j++) {
      const toTeam = teams[j];

      // Evaluate ONLY ONE direction per pair
      const proposal = evaluateTradeForTeam(
        state,
        fromTeam.id,
        toTeam.id
      );

      if (!proposal) continue;

      nextInbox[toTeam.id].push({
        ...proposal,
        createdAt: now,
      });
    }
  }

  /* --------------------------------------------
     3️⃣ COMMIT STATE
  -------------------------------------------- */

  return {
    ...state,
    tradeInbox: nextInbox,
    log: [
      ...state.log,
      {
        id: `log_trade_inbox_${now}`,
        timestamp: now,
        type: "TRADE_INBOX_REFRESH",
        description: "Generated new trade proposals",
      },
    ],
  };
}
