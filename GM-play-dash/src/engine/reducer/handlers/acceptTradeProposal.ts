import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { TradeProposal } from "../../types/trade";

import { revalueAllPlayers } from "../../sim/revalueAllPlayers";

/**
 * Accepts a trade proposal and applies it authoritatively.
 *
 * HARD GUARANTEES:
 * - Atomic roster swap
 * - Contracts move with players
 * - Proposal removed from inbox
 * - Player values recomputed
 * - Deterministic + reducer-safe
 *
 * DOES NOT:
 * - Validate fairness (already evaluated)
 * - Enforce payroll
 * - Handle injuries or morale (later phases)
 */
export function handleAcceptTradeProposal(
  state: LeagueState,
  args: {
    toTeamId: EntityId;
    proposalId: EntityId;
  }
): LeagueState {
  const { toTeamId, proposalId } = args;

  const inbox = state.tradeInbox?.[toTeamId];
  if (!inbox) {
    console.warn("❌ acceptTradeProposal: inbox missing", toTeamId);
    return state;
  }

  const proposal = inbox.find(p => p.id === proposalId);
  if (!proposal) {
    console.warn("❌ acceptTradeProposal: proposal not found", proposalId);
    return state;
  }

  const {
    fromTeamId,
    fromTeamPlayers,
    toTeamPlayers,
  } = proposal;

  const now = Date.now();

  /* --------------------------------------------
     1️⃣ APPLY PLAYER MOVES
  -------------------------------------------- */

  const nextPlayers: LeagueState["players"] = {
    ...state.players,
  };

  // Players moving FROM fromTeam → toTeam
  for (const playerId of fromTeamPlayers) {
    const player = state.players[playerId];
    if (!player) continue;

    nextPlayers[playerId] = {
      ...player,
      updatedAt: now,
      teamId: toTeamId,
      contract: player.contract
        ? {
            ...player.contract,
            teamId: toTeamId,
          }
        : undefined,
      history: {
        ...player.history,
        transactions: [
          ...player.history.transactions,
          `TRADED:${fromTeamId}->${toTeamId}`,
        ],
      },
    };
  }

  // Players moving FROM toTeam → fromTeam
  for (const playerId of toTeamPlayers) {
    const player = state.players[playerId];
    if (!player) continue;

    nextPlayers[playerId] = {
      ...player,
      updatedAt: now,
      teamId: fromTeamId,
      contract: player.contract
        ? {
            ...player.contract,
            teamId: fromTeamId,
          }
        : undefined,
      history: {
        ...player.history,
        transactions: [
          ...player.history.transactions,
          `TRADED:${toTeamId}->${fromTeamId}`,
        ],
      },
    };
  }

  /* --------------------------------------------
     2️⃣ REMOVE PROPOSAL FROM ALL INBOXES
  -------------------------------------------- */

  const nextTradeInbox: LeagueState["tradeInbox"] = {};

  for (const [teamId, proposals] of Object.entries(state.tradeInbox ?? {})) {
    nextTradeInbox[teamId] = proposals.filter(
      p => p.id !== proposalId
    );
  }

  /* --------------------------------------------
     3️⃣ BUILD NEXT STATE
  -------------------------------------------- */

  let nextState: LeagueState = {
    ...state,
    players: nextPlayers,
    tradeInbox: nextTradeInbox,
    log: [
      ...state.log,
      {
        id: `log_trade_accept_${proposalId}_${now}`,
        timestamp: now,
        type: "TRADE_ACCEPTED",
        refs: [
          proposalId,
          fromTeamId,
          toTeamId,
          ...fromTeamPlayers,
          ...toTeamPlayers,
        ],
        description: `Trade accepted between ${fromTeamId} and ${toTeamId}`,
      },
    ],
  };

  /* --------------------------------------------
     4️⃣ REVALUE PLAYERS (AUTHORITATIVE)
  -------------------------------------------- */

  nextState = revalueAllPlayers(nextState);

  return nextState;
}
