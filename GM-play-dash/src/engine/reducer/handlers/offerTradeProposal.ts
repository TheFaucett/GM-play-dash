// src/engine/reducer/handlers/offerTradeProposal.ts

import type { LeagueState, LeagueEvent } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { TradeProposal } from "../../types/trade";

import { evaluateTradeValue } from "../../sim/evaluateTradeValue";

/* =============================================
   TYPES
============================================= */


export type OfferTradeProposalPayload = {
  fromTeamId: EntityId; // user team
  toTeamId: EntityId; // other team
  fromTeamPlayers: EntityId[];
  toTeamPlayers: EntityId[];
};

/* =============================================
   MAIN HANDLER
============================================= */

export function handleOfferTradeProposal(
  state: LeagueState,
  payload: OfferTradeProposalPayload
): LeagueState {
  const { fromTeamId, toTeamId, fromTeamPlayers, toTeamPlayers } = payload;
  console.log("🔥 handleOfferTradeProposal fired", payload);
  const now = Date.now();

  /* ---------------------------------------------
     SAFETY: VALIDATE TEAMS
  --------------------------------------------- */

  const fromTeam = state.teams[fromTeamId];
  const toTeam = state.teams[toTeamId];

  if (!fromTeam || !toTeam) {
    console.warn("OFFER_TRADE_PROPOSAL: invalid teams", {
      fromTeamId,
      toTeamId,
    });
    return state;
  }

  /* ---------------------------------------------
     SAFETY: MUST HAVE PLAYERS
  --------------------------------------------- */

  if (fromTeamPlayers.length === 0 || toTeamPlayers.length === 0) {
    console.warn("OFFER_TRADE_PROPOSAL: missing players", {
      fromTeamPlayers,
      toTeamPlayers,
    });
    return state;
  }

  /* ---------------------------------------------
     SAFETY: MAKE SURE PLAYERS EXIST + OWNERSHIP
  --------------------------------------------- */

  const fromPlayers = fromTeamPlayers
    .map((id) => state.players[id])
    .filter(Boolean);

  const toPlayers = toTeamPlayers
    .map((id) => state.players[id])
    .filter(Boolean);

  if (fromPlayers.length !== fromTeamPlayers.length) {
    console.warn("OFFER_TRADE_PROPOSAL: fromTeamPlayers missing in state");
    return state;
  }

  if (toPlayers.length !== toTeamPlayers.length) {
    console.warn("OFFER_TRADE_PROPOSAL: toTeamPlayers missing in state");
    return state;
  }

  // Ownership check
  if (fromPlayers.some((p) => p.teamId !== fromTeamId)) {
    console.warn("OFFER_TRADE_PROPOSAL: user does not own all fromTeamPlayers");
    return state;
  }

  if (toPlayers.some((p) => p.teamId !== toTeamId)) {
    console.warn("OFFER_TRADE_PROPOSAL: other team does not own all toTeamPlayers");
    return state;
  }

  /* ---------------------------------------------
     EVALUATE: WOULD OTHER TEAM ACCEPT?
  --------------------------------------------- */

  // AI POV:
  // - AI gives: toPlayers
  // - AI receives: fromPlayers
  const aiEvaluation = evaluateTradeValue({
    fromTeamPlayers: toPlayers,
    toTeamPlayers: fromPlayers,
  });

  /* ---------------------------------------------
     REJECTED: LOG ONLY
  --------------------------------------------- */

  if (aiEvaluation.verdict === "REJECT") {
    // 🔥 SUPER CLEAR DEV LOG
    console.log(
      `%c🔴 TRADE REJECTED by ${toTeam.name}`,
      "color: red; font-weight: bold;",
      {
        fromTeam: fromTeam.name,
        toTeam: toTeam.name,
        aiEvaluation,
        offeredPlayers: fromTeamPlayers,
        requestedPlayers: toTeamPlayers,
      }
    );

    const rejectedEvent: LeagueEvent = {
      id: `event_trade_rejected_${fromTeamId}_${toTeamId}_${now}`,
      timestamp: now,
      type: "TRADE_OFFER_REJECTED",
      refs: [],
      description: `${fromTeam.name} offered a trade to ${toTeam.name} — rejected.`,
    };

    return {
      ...state,
      log: [...state.log, rejectedEvent],
    };
  }

  /* ---------------------------------------------
     ACCEPTED: DEV LOG
  --------------------------------------------- */

  console.log(
    `%c🟢 TRADE ACCEPTED by ${toTeam.name}`,
    "color: lime; font-weight: bold;",
    {
      fromTeam: fromTeam.name,
      toTeam: toTeam.name,
      aiEvaluation,
      offeredPlayers: fromTeamPlayers,
      requestedPlayers: toTeamPlayers,
    }
  );

  /* ---------------------------------------------
     BUILD PROPOSAL
  --------------------------------------------- */

  const proposal: TradeProposal = {
    id: `trade_${fromTeamId}_${toTeamId}_${now}`,
    fromTeamId,
    toTeamId,
    fromTeamPlayers,
    toTeamPlayers,
    evaluation: aiEvaluation,
    verdict: aiEvaluation.verdict, // ✅ required by TradeProposal
    createdAt: now,
  };

  /* ---------------------------------------------
     COMMIT: ADD TO INBOX FOR RECEIVING TEAM
  --------------------------------------------- */

  const existingInbox = state.tradeInbox[toTeamId] ?? [];

  const sentEvent: LeagueEvent = {
    id: `event_trade_sent_${proposal.id}`,
    timestamp: now,
    type: "TRADE_OFFER_SENT",
    refs: [proposal.id],
    description: `${fromTeam.name} offered a trade to ${toTeam.name}.`,
  };

  return {
    ...state,
    tradeInbox: {
      ...state.tradeInbox,
      [toTeamId]: [proposal, ...existingInbox],
    },
    log: [...state.log, sentEvent],
  };
}
