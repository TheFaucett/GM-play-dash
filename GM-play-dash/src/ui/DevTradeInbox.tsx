import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { TradeProposal } from "../engine/types/trade";

import { handleAcceptTradeProposal } from "../engine/reducer/handlers/acceptTradeProposal";
import { handleRejectTradeProposal } from "../engine/reducer/handlers/rejectTradeProposal";

type Props = {
  state: LeagueState;
  setState: React.Dispatch<React.SetStateAction<LeagueState | null>>;
};

export function DevTradeInbox({ state, setState }: Props) {
  if (!state.meta.userTeamId) return null;

  const userTeamId: EntityId = state.meta.userTeamId;

  const inbox: TradeProposal[] =
    state.tradeInbox?.[userTeamId] ?? [];

  // If empty, show small debug block instead of crashing
  if (inbox.length === 0) {
    return (
      <section
        style={{
          marginTop: 16,
          padding: 12,
          border: "2px dashed #999",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        <h3 style={{ marginTop: 0 }}>📨 Trade Inbox</h3>
        <p style={{ marginBottom: 0 }}>
          No trade proposals available.
        </p>
      </section>
    );
  }

  // For now: show the most recent proposal
  const proposal = inbox[inbox.length - 1];

  const fromTeam = state.teams[proposal.fromTeamId];
  const toTeam = state.teams[proposal.toTeamId];

  const fromTeamName = fromTeam?.name ?? proposal.fromTeamId;
  const toTeamName = toTeam?.name ?? proposal.toTeamId;

  // Resolve player objects
  const incomingPlayers = proposal.fromTeamPlayers
    .map((id) => state.players[id])
    .filter(Boolean);

  const outgoingPlayers = proposal.toTeamPlayers
    .map((id) => state.players[id])
    .filter(Boolean);

  function acceptTrade() {
    setState((prev) => {
      if (!prev) return prev;

      return handleAcceptTradeProposal(prev, {
        toTeamId: userTeamId,
        proposalId: proposal.id,
      });
    });
  }

  function rejectTrade() {
    setState((prev) => {
      if (!prev) return prev;

      return handleRejectTradeProposal(prev, {
        toTeamId: userTeamId,
        proposalId: proposal.id,
      });
    });
  }

  return (
    <section
      style={{
        marginTop: 16,
        padding: 12,
        border: "2px solid #8844cc",
        borderRadius: 8,
        background: "#f8f5ff",
      }}
    >
      <h3 style={{ marginTop: 0 }}>📨 Trade Offer</h3>

      <p style={{ marginTop: 0 }}>
        <strong>{fromTeamName}</strong> offers:
      </p>

      <ul>
        {incomingPlayers.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> ({p.role})
          </li>
        ))}
      </ul>

      <p>In exchange for:</p>

      <ul>
        {outgoingPlayers.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> ({p.role})
          </li>
        ))}
      </ul>

      {/* OPTIONAL: evaluation */}
      <div style={{ marginTop: 10 }}>
        <div>
          <strong>Verdict:</strong>{" "}
          {proposal.evaluation.verdict}
        </div>

        {"delta" in proposal.evaluation && (
          <div>
            <strong>Delta:</strong>{" "}
            {(proposal.evaluation as any).delta}
          </div>
        )}
      </div>

      {/* BUTTONS */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={acceptTrade}
          style={{
            padding: "6px 12px",
            fontWeight: "bold",
          }}
        >
          ✅ Accept
        </button>

        <button
          onClick={rejectTrade}
          style={{
            padding: "6px 12px",
            fontWeight: "bold",
            background: "#ffdddd",
          }}
        >
          ❌ Reject
        </button>
      </div>
    </section>
  );
}
