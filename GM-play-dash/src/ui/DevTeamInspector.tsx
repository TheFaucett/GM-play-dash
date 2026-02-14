// src/dev/DevTeamInspector.tsx

import React, { useMemo, useState } from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Player } from "../engine/types/player";

type Props = {
  state: LeagueState;
};

export function DevTeamInspector({ state }: Props) {
  const teamList = useMemo(() => {
    return Object.values(state.teams).slice().sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }, [state.teams]);

  const defaultTeamId: EntityId | null =
    state.meta.userTeamId ?? teamList[0]?.id ?? null;

  const [teamId, setTeamId] = useState<EntityId | null>(defaultTeamId);

  const team = teamId ? state.teams[teamId] : null;

  const players: Player[] = useMemo(() => {
    if (!teamId) return [];

    return Object.values(state.players)
      .filter((p) => p.teamId === teamId)
      .slice()
      .sort((a, b) => {
        // sort by role then overall desc
        const roleA = a.role ?? "";
        const roleB = b.role ?? "";
        if (roleA !== roleB) return roleA.localeCompare(roleB);

        const oa = a.value?.overall ?? 0;
        const ob = b.value?.overall ?? 0;
        return ob - oa;
      });
  }, [state.players, teamId]);

  if (!team) return null;

  return (
    <section
      style={{
        marginTop: 16,
        padding: 12,
        border: "2px solid #333",
        borderRadius: 8,
        background: "#fafafa",
      }}
    >
      <h3 style={{ marginTop: 0 }}>🧾 Team Inspector</h3>

      {/* TEAM PICKER */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <strong>Team:</strong>{" "}
        </label>

        <select
          value={teamId ?? ""}
          onChange={(e) => setTeamId(e.target.value as EntityId)}
        >
          {teamList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.id})
            </option>
          ))}
        </select>

        <span style={{ opacity: 0.7 }}>
          Players: {players.length}
        </span>
      </div>

      {/* QUICK TEAM INFO */}
      <div style={{ marginTop: 10, fontSize: 14 }}>
        <div>
          <strong>{team.name}</strong> — Market:{" "}
          <code>{team.marketSize}</code> — BudgetFactor:{" "}
          <code>{team.budgetFactor}</code>
        </div>

        <div style={{ marginTop: 4 }}>
          Active Pitcher:{" "}
          <code>{team.activePitcherId ?? "null"}</code>
        </div>
      </div>

      {/* PLAYERS */}
      <div style={{ marginTop: 12 }}>
        {players.length === 0 ? (
          <p style={{ color: "crimson" }}>
            ❌ No players found for teamId {teamId}
          </p>
        ) : (
          players.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))
        )}
      </div>
    </section>
  );
}

/* ==============================================
   PLAYER CARD
============================================== */

function PlayerCard({ player }: { player: Player }) {
  const [open, setOpen] = useState(false);

  const overall = player.value?.overall ?? 0;
  const total = player.value?.total ?? 0;

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        border: "1px solid #ccc",
        borderRadius: 8,
        background: "#fff",
      }}
    >
      {/* SUMMARY ROW */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <strong>{player.name}</strong>{" "}
          <span style={{ opacity: 0.7 }}>
            ({player.role})
          </span>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Age: {player.age} | Team: {player.teamId} | ID: {player.id}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div>
            Overall: <strong>{overall}</strong>
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Total: {total}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              marginTop: 6,
              padding: "4px 8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {open ? "Hide JSON" : "Show JSON"}
          </button>
        </div>
      </div>

      {/* FULL OBJECT */}
      {open && (
        <pre
          style={{
            marginTop: 10,
            background: "#111",
            color: "#0f0",
            padding: 10,
            borderRadius: 8,
            overflowX: "auto",
            fontSize: 12,
          }}
        >
          {JSON.stringify(player, null, 2)}
        </pre>
      )}
    </div>
  );
}
