import React, { useState } from "react";
import type { LeagueState } from "../engine/types/league";

import { createDevFullLeague } from "../engine/sim/createDevFullLeague";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";
import { DevGameList } from "./DevGameList";
import { DevBatchSimControls } from "./DevBatchSimControls";
export function DevLeagueHarness() {
  const [state, setState] = useState<LeagueState | null>(null);

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
      players: Object.keys(next.players).length,
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

        <button onClick={createLeague} style={{ marginLeft: 8 }}>
          Reset League
        </button>
      </div>

      {/* ------------------------------- */}
      <DevBatchSimControls state={state} setState={setState} />
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
