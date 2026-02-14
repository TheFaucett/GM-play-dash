import React, { useMemo } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

type Props = {
  state: LeagueState;
};

export function PlayerProfileCard({ state }: Props) {
  const selectedPlayerId = state.pointers.selectedPlayerId as EntityId | undefined;

  const player = useMemo(() => {
    if (!selectedPlayerId) return null;
    return state.players[selectedPlayerId] ?? null;
  }, [state.players, selectedPlayerId]);

  if (!selectedPlayerId) {
    return (
      <div style={{ padding: 16 }}>
        <h2>👤 Player Profile</h2>
        <p>Select a player from the roster sidebar.</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div style={{ padding: 16 }}>
        <h2>👤 Player Profile</h2>
        <p style={{ color: "red" }}>
          Selected player not found: {selectedPlayerId}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>👤 Player Profile</h2>

      <div style={{ marginBottom: 12 }}>
        <strong>ID:</strong> {player.id}
        <br />
        <strong>Role:</strong> {player.role}
        <br />
        <strong>Team:</strong> {player.teamId}
      </div>

      <pre
        style={{
          background: "#111",
          border: "1px solid #333",
          padding: 12,
          color: "#0f0",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(player, null, 2)}
      </pre>
    </div>
  );
}
