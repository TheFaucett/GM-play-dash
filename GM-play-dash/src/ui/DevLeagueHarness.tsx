import React, { useState } from "react";
import type { LeagueState } from "../engine/types/league";
import { DevSeasonProgress } from "./DevSeasonProgress"
import { createDevFullLeague } from "../engine/sim/createDevFullLeague";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";
import { DevGameList } from "./DevGameList";
import { DevBatchSimControls } from "./DevBatchSimControls";
import { DevPlayerSeasonStats } from "./DevPlayerSeasonStats";
import { DevSignFreeAgent } from "./DevSignFreeAgent";
import { generatePlayerPool } from "../engine/sim/generatePlayerPool";
import { DevFreeAgentBoard } from "./DevFreeAgentBoard";
import { autoFillTeams } from "../engine/sim/autoFillTeams";



export function DevLeagueHarness() {
  const [state, setState] = useState<LeagueState | null>(null);
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

        // Assign players to teams
        for (const teamId of teamIds) {
        const roster = teams[teamId] ?? [];

        for (const playerId of roster) {
            nextPlayers[playerId] = {
            ...nextPlayers[playerId],
            teamId,
            };
        }

        // TEMP roster wiring (v1)
        nextTeams[teamId] = {
            ...nextTeams[teamId],
            rosterIds: roster,
        } as any; // lineup/rotation comes next
        }

        // Remaining players stay FA
        for (const playerId of freeAgents) {
        nextPlayers[playerId] = {
            ...nextPlayers[playerId],
            teamId: "FA",
        };
        }

        console.log("🏗️ Auto-filled rosters", {
        teams: Object.keys(teams).length,
        freeAgents: freeAgents.length,
        });

        return {
        ...prev,
        players: nextPlayers,
        teams: nextTeams,
        };
    });
  }
    /* --------------------------------------------
     ACTIONS
  -------------------------------------------- */

  function createLeague() {
    console.log("🟢 CREATE DEV LEAGUE");

    const next = createDevFullLeague({
      seed: Math.random(),
      year: new Date().getFullYear(),
    });

    console.log("✅ League created", {
      teams: Object.keys(next.teams).length,
      players: Object.keys(next.players),
      seasons: Object.keys(next.seasons),
    });
    
    setState(next);
  }

  function simSeason() {
    console.log("🟡 SIM SEASON CLICKED");

    setState((prev) => {
      if (!prev) return prev;

      const next = handleSimSeason(prev);

      console.log("🏁 SIM SEASON COMPLETE");

      return next;
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
     DERIVED DEBUG DATA
  -------------------------------------------- */

  const seasonId = state.pointers.seasonId;
  const season = seasonId ? state.seasons[seasonId] : null;

  const pool = generatePlayerPool(1500, Math.random());

  state.players = pool.players;
  state.playerPool = pool;

  /* --------------------------------------------
     ACTIVE VIEW
  -------------------------------------------- */

  return (
    <div style={{ padding: 16 }}>
      <h2>⚾ Dev League Harness</h2>
    <DevGameList state={state} />
      <div style={{ marginBottom: 12 }}>
        <button onClick={simSeason}>
          Sim Full Season
        </button>
        <button onClick={autoFillAllRosters} style={{ marginLeft: 8 }}>
          Auto-Fill Rosters
        </button>
        <button onClick={createLeague} style={{ marginLeft: 8 }}>
          Reset League
        </button>
      </div>
      { state && <DevSeasonProgress state={state}/>}
      {/* ------------------------------- */}
      <DevBatchSimControls state={state} setState={setState} />
      <DevPlayerSeasonStats state={state} />
      <DevSignFreeAgent
        state={state}
        setState={setState}
      />
      <DevFreeAgentBoard state={state}/>
      {/* ------------------------------- */}
          POINTER DEBUG
      -------------------------------- */
      <pre style={{ background: "#111", color: "#0f0", padding: 8 }}>
        <strong>POINTERS</strong>
        {JSON.stringify(state.pointers, null, 2)}
      </pre>

      {/* -------------------------------
          SEASON DEBUG
      -------------------------------- */}
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

      {/* -------------------------------
          STANDINGS SNAPSHOT
      -------------------------------- */}
      {season && (
        <pre style={{ background: "#111", color: "#fff", padding: 8 }}>
          <strong>STANDINGS (TOP 5)</strong>
          {JSON.stringify(
            Object.entries(season.standings)
              .slice(0, 5)
              .map(([teamId, r]) => ({
                teamId,
                wins: r.wins,
                losses: r.losses,
                runsFor: r.runsFor,
                runsAgainst: r.runsAgainst,
              })),
            null,
            2
          )}
        </pre>
      )}
    </div>
  );
}
