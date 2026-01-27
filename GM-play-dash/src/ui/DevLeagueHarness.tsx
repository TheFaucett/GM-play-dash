// src/ui/DevLeagueHarness.tsx

import React, { useState } from "react";
import type { LeagueState } from "../engine/types/league";

import { createDevFullLeague } from "../engine/sim/createDevFullLeague";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";

import { DevSeasonProgress } from "./DevSeasonProgress";
import { DevGameList } from "./DevGameList";
import { DevBatchSimControls } from "./DevBatchSimControls";
import { DevPlayerSeasonStats } from "./DevPlayerSeasonStats";
import { DevSignFreeAgent } from "./DevSignFreeAgent";
import { DevFreeAgentBoard } from "./DevFreeAgentBoard";

import { autoFillTeams } from "../engine/sim/autoFillTeams";
import { autoConfigureTeams } from "../engine/sim/autoConfigureTeams";

import { TeamSelectionScreen } from "./TeamSelectionScreen";
import { UserTeamDashboard } from "./UserTeamDashboard";

export function DevLeagueHarness() {
  const [state, setState] = useState<LeagueState | null>(null);

  /* --------------------------------------------
     LEAGUE CREATION
  -------------------------------------------- */

  function createLeague() {
    const next = createDevFullLeague({
      seed: Math.random(),
      year: new Date().getFullYear(),
    });

    console.log("✅ League created", {
      teams: Object.keys(next.teams).length,
      players: Object.keys(next.players).length,
    });

    setState(next);
  }

  /* --------------------------------------------
     AUTO-FILL ROSTERS
  -------------------------------------------- */

  function autoFillAllRosters() {
    setState((prev) => {
      if (!prev) return prev;

      const teamIds = Object.keys(prev.teams);
      const { teams, freeAgents } = autoFillTeams({
        players: prev.players,
        teamIds,
      });

      const nextPlayers = { ...prev.players };
      const nextTeams = { ...prev.teams };

      for (const [teamId, playerIds] of Object.entries(teams)) {
        for (const pid of playerIds) {
          nextPlayers[pid] = {
            ...nextPlayers[pid],
            teamId,
          };
        }
      }

      for (const pid of freeAgents) {
        nextPlayers[pid] = {
          ...nextPlayers[pid],
          teamId: "FA",
        };
      }

      const configured = autoConfigureTeams({
        ...prev,
        players: nextPlayers,
        teams: nextTeams,
      });

      console.log("🏗️ Rosters auto-filled");

      return configured;
    });
  }

  /* --------------------------------------------
     SIM SEASON
  -------------------------------------------- */

  function simSeason() {
    setState((prev) => {
      if (!prev) return prev;
      return handleSimSeason(prev);
    });
  }

  /* --------------------------------------------
     EMPTY STATE
  -------------------------------------------- */

  if (!state) {
    return (
      <div style={{ padding: 16 }}>
        <h2>⚾ Dev League Harness</h2>
        <button onClick={createLeague}>Create Full Dev League</button>
      </div>
    );
  }

  /* --------------------------------------------
     TEAM SELECTION GATE
  -------------------------------------------- */

  if (!state.meta.userTeamId) {
    return (
      <TeamSelectionScreen
        state={state}
        setState={setState}
      />
    );
  }

  /* --------------------------------------------
     DERIVED DATA
  -------------------------------------------- */

  const seasonId = state.pointers.seasonId;
  const season = seasonId ? state.seasons[seasonId] : null;

  /* --------------------------------------------
     MAIN VIEW
  -------------------------------------------- */

  return (
    <div style={{ padding: 16 }}>
      <h2>⚾ Dev League Harness</h2>

      {/* USER GM DASHBOARD */}
      <UserTeamDashboard
        state={state}
        onStartSeason={() =>
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  meta: {
                    ...prev.meta,
                    phase: "REGULAR_SEASON",
                  },
                }
              : prev
          )
        }
      />

      {/* DEV CONTROLS */}
      <div style={{ marginBottom: 12 }}>
        <button onClick={simSeason}>Sim Full Season</button>
        <button onClick={autoFillAllRosters} style={{ marginLeft: 8 }}>
          Auto-Fill Rosters
        </button>
        <button onClick={createLeague} style={{ marginLeft: 8 }}>
          Reset League
        </button>
      </div>

      {season && <DevSeasonProgress state={state} />}

      <DevGameList state={state} />
      <DevBatchSimControls state={state} setState={setState} />
      <DevPlayerSeasonStats state={state} />
      <DevSignFreeAgent state={state} setState={setState} />
      <DevFreeAgentBoard state={state} />

      {/* DEBUG */}
      <pre style={{ background: "#111", color: "#0f0", padding: 8 }}>
        <strong>POINTERS</strong>
        {JSON.stringify(state.pointers, null, 2)}
      </pre>

      {season && (
        <pre style={{ background: "#111", color: "#0ff", padding: 8 }}>
          <strong>SEASON</strong>
          {JSON.stringify(
            {
              year: season.year,
              status: season.status,
              day: season.day,
              games: season.gameIds.length,
              currentGameIndex: season.currentGameIndex,
            },
            null,
            2
          )}
        </pre>
      )}
    </div>
  );
}
