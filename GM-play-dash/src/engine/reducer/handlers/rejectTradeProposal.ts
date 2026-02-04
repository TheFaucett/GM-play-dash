import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";

/**
 * Rejects a trade proposal.
 *
 * HARD GUARANTEES:
 * - Pure reducer
 * - No roster or contract changes
 * - Proposal removed from inbox
 * - Deterministic
 *
 * DOES NOT:
 * - Re-evaluate trades
 * - Generate new proposals
 */
export function handleRejectTradeProposal(
  state: LeagueState,
  args: {
    toTeamId: EntityId;
    proposalId: EntityId;
  }
): LeagueState {
  const { toTeamId, proposalId } = args;

  const inbox = state.tradeInbox?.[toTeamId];
  if (!inbox) {
    console.warn("❌ rejectTradeProposal: inbox missing", toTeamId);
    return state;
  }

  const proposalExists = inbox.some(p => p.id === proposalId);
  if (!proposalExists) {
    console.warn("❌ rejectTradeProposal: proposal not found", proposalId);
    return state;
  }

  const now = Date.now();

  /* --------------------------------------------
     1️⃣ REMOVE PROPOSAL FROM ALL INBOXES
  -------------------------------------------- */

  const nextTradeInbox: LeagueState["tradeInbox"] = {};

  for (const [teamId, proposals] of Object.entries(state.tradeInbox ?? {})) {
    nextTradeInbox[teamId] = proposals.filter(
      p => p.id !== proposalId
    );
  }

  /* --------------------------------------------
     2️⃣ LOG REJECTION
  -------------------------------------------- */

  return {
    ...state,
    tradeInbox: nextTradeInbox,
    log: [
      ...state.log,
      {
        id: `log_trade_reject_${proposalId}_${now}`,
        timestamp: now,
        type: "TRADE_REJECTED",
        refs: [proposalId, toTeamId],
        description: `Trade proposal ${proposalId} rejected by ${toTeamId}`,
      },
    ],
  };
}
