// src/ui/UserTeamDashboard.tsx

import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { Player } from "../engine/types/player";

type Props = {
  state: LeagueState;
  onStartSeason: () => void;
};

function isPitcher(p: Player) {
  return p.role === "SP" || p.role === "RP" || p.role === "CL";
}

export function UserTeamDashboard({ state, onStartSeason }: Props) {
  const { meta, teams, players } = state;

  const userTeamId = meta.userTeamId;
  if (!userTeamId) return null;

  const team = teams[userTeamId];
  if (!team) return null;

  const roster = Object.values(players).filter(
    (p) => p.teamId === userTeamId
  );

  const pitchers = roster.filter(isPitcher);
  const batters = roster.filter((p) => !isPitcher(p));

  /* --------------------------------------------
     VERY BASIC NEED DETECTION (v1)
  -------------------------------------------- */
  const needs: string[] = [];

  if (team.rotation.length < 5) needs.push("Starting Pitching");
  if (batters.length < 13) needs.push("Batting Depth");
  if (pitchers.length < 11) needs.push("Bullpen Arms");

  const rosterIsValid = needs.length === 0;
  const canStartSeason =
    meta.phase === "OFFSEASON" && rosterIsValid;

  return (
    <section
      style={{
        marginTop: 16,
        padding: 16,
        border: "2px solid #444",
        borderRadius: 8,
      }}
    >
      <h2>🏟️ {team.name}</h2>

      <div style={{ fontSize: 14, color: "#aaa" }}>
        Market: <strong>{team.marketSize}</strong> &nbsp;•&nbsp;
        Budget Factor:{" "}
        <strong>{team.budgetFactor.toFixed(2)}</strong>
      </div>

      {/* -------------------------------------------- */}
      {/* ROSTER SUMMARY */}
      {/* -------------------------------------------- */}
      <div style={{ marginTop: 12 }}>
        <h4>Roster</h4>
        <ul>
          <li>Batters: {batters.length}</li>
          <li>Pitchers: {pitchers.length}</li>
          <li>Total Players: {roster.length}</li>
        </ul>
      </div>

      {/* -------------------------------------------- */}
      {/* TEAM NEEDS */}
      {/* -------------------------------------------- */}
      <div style={{ marginTop: 12 }}>
        <h4>Team Needs</h4>

        {needs.length === 0 ? (
          <div style={{ color: "#4caf50" }}>
            ✓ Roster looks balanced
          </div>
        ) : (
          <ul>
            {needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      {/* -------------------------------------------- */}
      {/* ACTIONS */}
      {/* -------------------------------------------- */}
      <div style={{ marginTop: 16 }}>
        <h4>Actions</h4>

        {meta.phase !== "OFFSEASON" && (
          <div style={{ fontSize: 13, color: "#aaa" }}>
            Season already in progress
          </div>
        )}

        {!rosterIsValid && meta.phase === "OFFSEASON" && (
          <div style={{ fontSize: 13, color: "#e57373" }}>
            Cannot start season: roster is incomplete
          </div>
        )}

        <button
          onClick={onStartSeason}
          disabled={!canStartSeason}
          style={{
            marginTop: 8,
            padding: "6px 12px",
            fontWeight: "bold",
            opacity: canStartSeason ? 1 : 0.5,
            cursor: canStartSeason ? "pointer" : "not-allowed",
          }}
        >
          ▶ Start Season
        </button>
      </div>
    </section>
  );
}
