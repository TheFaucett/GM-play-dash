import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import { handleAcceptTradeProposal } from "../engine/reducer/handlers/acceptTradeProposal";

type Props = {
  state: LeagueState;
  setState: React.Dispatch<React.SetStateAction<LeagueState | null>>;
};

export function DevTradeInbox({ state, setState }: Props) {
  /* ---------------------------------------------
     HARD GUARDS (AUTHORITATIVE)
  --------------------------------------------- */

  const rawUserTeamId = state.meta.userTeamId;
  if (rawUserTeamId == null) return null;

  // ✅ TS now knows this is a real string
  const userTeamId: EntityId = rawUserTeamId;

  const inbox = state.tradeInbox?.[userTeamId];
  if (!inbox || inbox.length === 0) {
    return (
      <section style={{ marginTop: 16, opacity: 0.6 }}>
        <h3>📨 Trade Inbox</h3>
        <p>No trade proposals available.</p>
      </section>
    );
  }

  // Phase B2: show first proposal only
  const proposal = inbox[0];

  const fromTeam = state.teams[proposal.fromTeamId];
  const toTeam = state.teams[proposal.toTeamId];

  if (!fromTeam || !toTeam) return null;

  const outgoingPlayers = proposal.toTeamPlayers
    .map((id) => state.players[id])
    .filter(Boolean);

  const incomingPlayers = proposal.fromTeamPlayers
    .map((id) => state.players[id])
    .filter(Boolean);

  /* ---------------------------------------------
     ACCEPT HANDLER
  --------------------------------------------- */

  function acceptTrade() {
    setState((prev) => {
      if (!prev) return prev;

      let next = handleAcceptTradeProposal(prev, {
        toTeamId: userTeamId,
        proposalId: proposal.id,
      });

      /* -----------------------------------------
         DEV AUTO-DFA (26-MAN SAFETY)
      ----------------------------------------- */

      const roster = Object.values(next.players).filter(
        (p) => p.teamId === userTeamId
      );

      if (roster.length > 26) {
        const dfa = roster[roster.length - 1];

        next = {
          ...next,
          players: {
            ...next.players,
            [dfa.id]: {
              ...dfa,
              teamId: "FA",
            },
          },
          log: [
            ...next.log,
            {
              id: `log_dfa_${Date.now()}`,
              timestamp: Date.now(),
              type: "AUTO_DFA",
              refs: [dfa.id],
              description: `${dfa.name} was designated for assignment`,
            },
          ],
        };
      }

      return next;
    });
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

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
      <h3>📨 Trade Offer</h3>

      <p>
        <strong>{fromTeam.name}</strong> offers:
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

      <p style={{ marginTop: 8, fontSize: 13 }}>
        <strong>Evaluation:</strong>{" "}
        {proposal.evaluation.verdict} (
        Δ {proposal.evaluation.delta})
      </p>

      <button
        onClick={acceptTrade}
        style={{
          marginTop: 10,
          padding: "6px 12px",
          fontWeight: "bold",
        }}
      >
        ✅ Accept Trade
      </button>
    </section>
  );
}
