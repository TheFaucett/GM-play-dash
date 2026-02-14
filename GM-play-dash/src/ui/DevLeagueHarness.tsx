import React, { useState } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

import { reducer } from "../engine/reducer/reducer";

import { createDevFullLeague } from "../engine/sim/createDevFullLeague";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";
import { handleAdvanceOffseasonDay } from "../engine/reducer/handlers/advanceOffseasonDay";
import { forceTradeProposal } from "../engine/sim/forceTradeProposal";

import { PlayerSidebar } from "./PlayerSidebar";
import { PlayerProfileCard } from "./PlayerProfileCard";

import { DevTradeOfferBuilder } from "./DevTradeOfferBuilder";
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

  // 🔥 overlay drawer open/close
  const [overlayOpen, setOverlayOpen] = useState(true);

  /* --------------------------------------------
     REDUCER DISPATCH WRAPPER
  -------------------------------------------- */
  function dispatch(action: any) {
    setState((prev) => {
      if (!prev) return prev;
      return reducer(prev, action);
    });
  }

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
     SIM FULL SEASON
  -------------------------------------------- */
  function simSeason() {
    setState((prev) => {
      if (!prev) return prev;
      return handleSimSeason(prev);
    });
  }

  /* --------------------------------------------
     ADVANCE OFFSEASON DAY
  -------------------------------------------- */
  function advanceOffseasonDay() {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.meta.phase !== "OFFSEASON") return prev;
      return handleAdvanceOffseasonDay(prev);
    });
  }

  /* --------------------------------------------
     FORCE TRADE (DEV)
  -------------------------------------------- */
  function forceTrade() {
    setState((prev) => {
      if (!prev || !prev.meta.userTeamId) return prev;

      const userTeamId: EntityId = prev.meta.userTeamId;

      const otherTeam = Object.values(prev.teams).find(
        (t) => t.id !== userTeamId
      );

      if (!otherTeam) return prev;

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
        <button onClick={createLeague}>Create Full Dev League</button>
      </div>
    );
  }

  /* --------------------------------------------
     TEAM SELECTION
  -------------------------------------------- */
  if (!state.meta.userTeamId) {
    return <TeamSelectionScreen state={state} setState={setState} />;
  }

  const seasonId = state.pointers.seasonId;
  const season = seasonId ? state.seasons[seasonId] : null;

  /* --------------------------------------------
     BASE APP (UNDERLAY)
  -------------------------------------------- */
  return (
    <div style={{ padding: 16 }}>
      {/* Underlay content (can be messy, doesn’t matter now) */}
      <h2>⚾ Dev League Harness</h2>

      <UserTeamDashboard
        state={state}
        onStartSeason={() =>
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  meta: { ...prev.meta, phase: "REGULAR_SEASON" },
                }
              : prev
          )
        }
      />

      <div style={{ marginTop: 12 }}>
        <DevTradeOfferBuilder state={state} dispatch={dispatch} />
        <DevTradeInbox state={state} setState={setState} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={simSeason}>Sim Full Season</button>
        <button onClick={autoFillAllRosters} style={{ marginLeft: 8 }}>
          Auto-Fill Rosters
        </button>
        <button onClick={createLeague} style={{ marginLeft: 8 }}>
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
          🧪 Force Trade
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

      {/* --------------------------------------------
         🔥 MASSIVE IMPASSABLE OVERLAY LAYER
         (this will sit ABOVE EVERYTHING)
      -------------------------------------------- */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          pointerEvents: "none", // IMPORTANT: overlay doesn't block clicks globally
        }}
      >
        {/* Right-side drawer area DOES accept clicks */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: overlayOpen ? 420 : 52,
            background: "#0b0b0b",
            borderLeft: "1px solid #333",
            boxShadow: "-8px 0 30px rgba(0,0,0,0.65)",
            transition: "width 0.2s ease",
            pointerEvents: "auto", // drawer is clickable
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              padding: 10,
              borderBottom: "1px solid #222",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
              {overlayOpen ? "PLAYER PANEL" : ""}
            </div>

            <button
              onClick={() => setOverlayOpen((v) => !v)}
              style={{
                background: "#111",
                color: "#fff",
                border: "1px solid #444",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {overlayOpen ? "→" : "←"}
            </button>
          </div>

          {/* Body */}
          {overlayOpen ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Your sidebar (search/list/click) */}
              <PlayerSidebar state={state} dispatch={dispatch} />

              {/* Player profile below it (optional) */}
              <div style={{ borderTop: "1px solid #222", padding: 10 }}>
                <PlayerProfileCard state={state} />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1 }} />
          )}
        </div>
      </div>
    </div>
  );
}
