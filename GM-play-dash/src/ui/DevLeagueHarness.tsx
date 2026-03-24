import React, { useState } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

import { reducer } from "../engine/reducer/reducer";

import { createDevFullLeague } from "../engine/sim/createDevFullLeague";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";
import { handleAdvanceOffseasonDay } from "../engine/reducer/handlers/advanceOffseasonDay";
import { forceTradeProposal } from "../engine/sim/forceTradeProposal";
import { ReleasePlayerButton } from "./ReleasePlayerButton";

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

/* =============================================
   STYLES
============================================= */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#070707",
    color: "#e8e8e8",
    padding: 16,
  } as React.CSSProperties,

  container: {
    maxWidth: 1120,
    margin: "0 auto",
  } as React.CSSProperties,

  titleRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  } as React.CSSProperties,

  h2: {
    margin: 0,
    fontSize: 22,
    letterSpacing: 0.2,
  } as React.CSSProperties,

  subtle: {
    opacity: 0.75,
    fontSize: 12,
  } as React.CSSProperties,

  card: {
    border: "1px solid #222",
    background: "#0b0b0b",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  } as React.CSSProperties,

  cardTitle: {
    fontWeight: 800,
    marginBottom: 10,
    fontSize: 13,
    opacity: 0.95,
  } as React.CSSProperties,

  actionBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 10,
  } as React.CSSProperties,

  btn: {
    background: "#111",
    color: "#ddd",
    border: "1px solid #333",
    padding: "6px 10px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  } as React.CSSProperties,

  btnPrimary: {
    background: "#141414",
    color: "#aee",
    border: "1px solid #355",
  } as React.CSSProperties,

  btnGold: {
    background: "#1b1606",
    color: "#ffdd66",
    border: "1px solid #3a2c08",
  } as React.CSSProperties,

  btnGreen: {
    background: "#081b10",
    color: "#00ff88",
    border: "1px solid #0a3b20",
  } as React.CSSProperties,

  divider: {
    height: 1,
    background: "#161616",
    margin: "12px 0",
  } as React.CSSProperties,
};

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

      const otherTeam = Object.values(prev.teams).find((t) => t.id !== userTeamId);

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
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.titleRow}>
            <h2 style={styles.h2}>⚾ Dev League Harness</h2>
            <div style={styles.subtle}>Simulation-first sandbox</div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Setup</div>
            <button style={styles.btn} onClick={createLeague}>
              Create Full Dev League
            </button>
          </div>
        </div>
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
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.titleRow}>
          <h2 style={styles.h2}>⚾ Dev League Harness</h2>
          <div style={styles.subtle}>
            Phase: <b>{state.meta.phase}</b> • Teams: {Object.keys(state.teams).length} • Players:{" "}
            {Object.keys(state.players).length}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>User Team</div>
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
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Dev Controls</div>

          <div style={styles.actionBar}>
            <button style={styles.btn} onClick={simSeason}>
              Sim Full Season
            </button>

            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => dispatch({ type: "PROJECT_ALL_PLAYERS" })}
              title="One-shot: compute and cache projections for every player"
            >
              🔮 Project All Players
            </button>

            <button style={styles.btn} onClick={autoFillAllRosters}>
              Auto-Fill Rosters
            </button>

            <button style={styles.btn} onClick={createLeague}>
              Reset League
            </button>

            <button style={{ ...styles.btn, ...styles.btnGold }} onClick={forceTrade}>
              🧪 Force Trade
            </button>

            {state.meta.phase === "OFFSEASON" && (
              <button style={{ ...styles.btn, ...styles.btnGreen }} onClick={advanceOffseasonDay}>
                ➡ Advance Offseason Day
              </button>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Trades</div>
          <DevTradeOfferBuilder state={state} dispatch={dispatch} />
          <div style={styles.divider} />
          <DevTradeInbox state={state} setState={setState} />
        </div>

        {season && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Season</div>
            <DevSeasonProgress state={state} />
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.cardTitle}>Games</div>
          <DevGameList state={state} />
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Batch Sim (DEV)</div>
          <DevBatchSimControls state={state} setState={setState} />
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Player Season Stats</div>
          <DevPlayerSeasonStats state={state} />
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Free Agency</div>
          <DevSignFreeAgent state={state} dispatch={dispatch} />
          <div style={styles.divider} />
          <DevFreeAgentBoard state={state} dispatch={dispatch} />
          <div style={styles.divider} />
          <ReleasePlayerButton state={state} dispatch={dispatch} />
        </div>
      </div>

      {/* --------------------------------------------
         🔥 MASSIVE IMPASSABLE OVERLAY LAYER
         (this will sit ABOVE EVERYTHING)
      -------------------------------------------- */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          pointerEvents: "none",
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
            pointerEvents: "auto",
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
                borderRadius: 8,
              }}
            >
              {overlayOpen ? "→" : "←"}
            </button>
          </div>

          {/* Body */}
          {overlayOpen ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <PlayerSidebar state={state} dispatch={dispatch} />
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