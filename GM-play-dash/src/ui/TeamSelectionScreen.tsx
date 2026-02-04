// src/ui/TeamSelectionScreen.tsx

import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { Team } from "../engine/types/team";

type Props = {
  state: LeagueState;
  setState: React.Dispatch<React.SetStateAction<LeagueState | null>>;
};

function marketLabel(team: Team) {
  if (team.marketSize === "large") return "🌆 Large Market";
  if (team.marketSize === "mid") return "🏙️ Mid Market";
  return "🌄 Small Market";
}

function budgetStars(team: Team) {
  if (team.budgetFactor >= 1.25) return "⭐⭐⭐⭐⭐";
  if (team.budgetFactor >= 1.0) return "⭐⭐⭐☆☆";
  return "⭐⭐☆☆☆";
}

export function TeamSelectionScreen({ state, setState }: Props) {
  const teams = Object.values(state.teams);

  // ✅ Source of truth: meta.userTeamId (NOT pointers)
  const selected = state.meta.userTeamId ?? null;

  function selectTeam(teamId: string) {
    setState((prev) => {
      if (!prev) return prev;

      // 🧪 Debug: prove what pointers look like BEFORE selection
      console.log("🧪 BEFORE TEAM SELECT — pointers", prev.pointers);

      const next: LeagueState = {
        ...prev,

        meta: {
          ...prev.meta,
          userTeamId: teamId,
        },

        // 🔒 HARD PRESERVE NAV POINTERS (seasonId MUST survive)
        pointers: {
          ...prev.pointers,
        },

        // 🔒 HARD PRESERVE INTENT MAPS
        playerIntent: {
          ...prev.playerIntent,
        },
        teamIntent: {
          ...prev.teamIntent,
        },
      };

      // 🧪 Debug: prove what pointers look like AFTER selection
      console.log("🧪 AFTER TEAM SELECT — pointers", next.pointers);

      return next;
    });
  }

  return (
    <section style={{ padding: 16 }}>
      <h2>🏟️ Choose Your Franchise</h2>

      <p style={{ maxWidth: 520 }}>
        Every team has a different market, budget, and long-term challenge.
        Choose wisely — this decision is permanent.
      </p>

      {/* 🧪 Debug panel (temporary) */}
      <pre style={{ background: "#111", color: "#0f0", padding: 8 }}>
        <strong>DEBUG</strong>
        {JSON.stringify(
          {
            selectedUserTeamId: state.meta.userTeamId,
            pointers: state.pointers,
          },
          null,
          2
        )}
      </pre>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        {teams.map((team) => {
          const isSelected = selected === team.id;

          return (
            <div
              key={team.id}
              style={{
                border: isSelected ? "2px solid #4caf50" : "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                background: isSelected ? "#f0fff4" : "#fff",
              }}
            >
              <h4 style={{ marginBottom: 4 }}>{team.name}</h4>

              <div style={{ fontSize: 13 }}>
                <div>{marketLabel(team)}</div>
                <div>Budget: {budgetStars(team)}</div>
                <div>
                  Roster:{" "}
                  {team.lineup.length + team.rotation.length + team.bullpen.length}
                  /26
                </div>
              </div>

              <button
                style={{ marginTop: 8 }}
                disabled={isSelected}
                onClick={() => selectTeam(team.id)}
              >
                {isSelected ? "✔ Selected" : "Manage This Team"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
