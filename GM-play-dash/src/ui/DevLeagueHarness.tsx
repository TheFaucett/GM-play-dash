import React, { useState } from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

import { createDevFullLeague } from "../engine/sim/createDevFullLeague";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";
import { handleAdvanceOffseasonDay } from "../engine/reducer/handlers/advanceOffseasonDay";

import { forceTradeProposal } from "../engine/sim/forceTradeProposal";

import { DevTradeInbox } from "./DevTradeInbox";
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
     AUTO-FILL ROSTERS (DEV)
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
     SIM FULL SEASON (DEV)
  -------------------------------------------- */
  function simSeason() {
    setState((prev) => {
      if (!prev) return prev;
      return handleSimSeason(prev);
    });
  }

  /* --------------------------------------------
     ADVANCE OFFSEASON DAY (DEV)
  -------------------------------------------- */
  function advanceOffseasonDay() {
    setState((prev) => {
      if (!prev) return prev;

      if (prev.meta.phase !== "OFFSEASON") {
        console.warn(
          "⛔ Cannot advance offseason day — not in OFFSEASON",
          prev.meta.phase
        );
        return prev;
      }

      console.log("➡️ DEV: Advance Offseason Day");
      return handleAdvanceOffseasonDay(prev);
    });
  }

  /* --------------------------------------------
     FORCE TRADE (DEV 🔥)
  -------------------------------------------- */
  function forceTrade() {
    setState((prev) => {
      if (!prev || !prev.meta.userTeamId) return prev;

      const userTeamId: EntityId = prev.meta.userTeamId;

      const otherTeam = Object.values(prev.teams).find(
        (t) => t.id !== userTeamId
      );

      if (!otherTeam) {
        console.warn("❌ DEV forceTrade: no other team found");
        return prev;
      }

      console.log("🧪 DEV: Forcing trade", {
        from: otherTeam.id,
        to: userTeamId,
      });

      return forceTradeProposal(prev, {
        fromTeamId: otherTeam.id,
        toTeamId: userTeamId,
      });
    });
  }

  /* --------------------------------------------
     EMPTY STATE
  -------------------------------------------- */
  if (!state) {
    return (
      <div style={{ padding: 16 }}>
        <h2>⚾ Dev League Harness</h2>
        <button onClick={createLeague}>
          Create Full Dev League
        </button>
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

      <DevTradeInbox state={state} setState={setState} />

      {/* DEV CONTROLS */}
      <div style={{ marginBottom: 12 }}>
        <button onClick={simSeason}>
          Sim Full Season
        </button>

        <button
          onClick={autoFillAllRosters}
          style={{ marginLeft: 8 }}
        >
          Auto-Fill Rosters
        </button>

        <button
          onClick={createLeague}
          style={{ marginLeft: 8 }}
        >
          Reset League
        </button>

        <button
          onClick={forceTrade}
          style={{
            marginLeft: 8,
            background: "#222",
            color: "#ffcc00",
            fontWeight: "bold",
          }}
        >
          🧪 Force Trade (DEV)
        </button>

        {state.meta.phase === "OFFSEASON" && (
          <button
            onClick={advanceOffseasonDay}
            style={{
              marginLeft: 8,
              background: "#222",
              color: "#0f0",
              fontWeight: "bold",
            }}
          >
            ➡ Advance Offseason Day
          </button>
        )}
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
              offseasonDay: season.offseasonDay,
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
