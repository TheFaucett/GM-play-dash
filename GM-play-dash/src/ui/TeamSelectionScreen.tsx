import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { Team } from "../engine/types/team";
import { handleSelectUserTeam } from "../engine/sim/selectUserTeam";

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
  const selected = state.pointers.userTeamId;

  function selectTeam(teamId: string) {
    setState((prev) =>
      prev
        ? handleSelectUserTeam(prev, {
            type: "SELECT_USER_TEAM",
            payload: { teamId },
          })
        : prev
    );
  }

  return (
    <section style={{ padding: 16 }}>
      <h2>🏟️ Choose Your Franchise</h2>

      <p style={{ maxWidth: 520 }}>
        Every team has a different market, budget, and long-term challenge.
        Choose wisely — this decision is permanent.
      </p>

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
                  {team.lineup.length +
                    team.rotation.length +
                    team.bullpen.length}
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
