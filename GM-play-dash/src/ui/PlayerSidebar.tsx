import React, { useMemo, useState } from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

type Props = {
  state: LeagueState;
  dispatch: (action: any) => void;
};

export function PlayerSidebar({ state, dispatch }: Props) {
  const userTeamId = state.meta.userTeamId as EntityId | null;
  const [search, setSearch] = useState("");

  if (!userTeamId) return null;

  const players = Object.values(state.players).filter(
    (p) => p.teamId === userTeamId
  );

  const filtered = useMemo(() => {
    return players.filter((p) =>
      p.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [players, search]);

  return (
    <div
      style={{
        width: 320,
        background: "#0f0f0f",
        borderRight: "1px solid #333",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #333",
          fontWeight: "bold",
        }}
      >
        PLAYER PANEL
      </div>

      {/* Search */}
      <div style={{ padding: 10 }}>
        <input
          placeholder="Search player..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: 6,
            background: "#111",
            border: "1px solid #333",
            color: "#fff",
          }}
        />
      </div>

      {/* Roster List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
        }}
      >
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() =>
              dispatch({
                type: "SELECT_PLAYER",
                payload: { playerId: p.id },
              })
            }
            style={{
              padding: 8,
              marginBottom: 6,
              background: "#181818",
              border: "1px solid #222",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: "bold" }}>{p.id}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {p.role} • Age {p.age ?? "?"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
