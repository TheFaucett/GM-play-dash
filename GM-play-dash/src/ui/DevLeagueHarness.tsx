import React, { useState } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Action } from "../engine/actions/types";

import { reducer } from "../engine/reducer/reducer";

import { createDevFullLeague } from "../engine/sim/createDevFullLeague";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";
import { handleAdvanceOffseasonDay } from "../engine/reducer/handlers/advanceOffseasonDay";
import { forceTradeProposal } from "../engine/sim/forceTradeProposal";
import { ReleasePlayerButton } from "./ReleasePlayerButton";

import { PlayerSidebar } from "./PlayerSidebar";
import { PlayerProfileCard } from "./PlayerProfileCard";
import { DevFreeAgentOfferPanel } from "./DevFreeAgentOfferPanel";
import { DevTradeOfferBuilder } from "./DevTradeOfferBuilder";
import { DevTradeInbox } from "./DevTradeInbox";
import { DevSeasonProgress } from "./DevSeasonProgress";
import { DevGameList } from "./DevGameList";
import { DevBatchSimControls } from "./DevBatchSimControls";
import { DevPlayerSeasonStats } from "./DevPlayerSeasonStats";
import { DevSignFreeAgent } from "./DevSignFreeAgent";
import { DevFreeAgentBoard } from "./DevFreeAgentBoard";
import { UserTeamRosterDashboard } from "./UserTeamRosterDashboard";
import { autoFillTeams } from "../engine/sim/autoFillTeams";
import { autoConfigureTeams } from "../engine/sim/autoConfigureTeams";
import { FrontOfficeInboxPanel } from "./FrontOfficeInboxPanel";
import { TeamSelectionScreen } from "./TeamSelectionScreen";
import { UserTeamDashboard } from "./UserTeamDashboard";

// ✅ NEW: sticky header data
import { computeTeamPayroll } from "../engine/sim/computeTeamPayroll";
import { deriveRosterView } from "../engine/sim/deriveRosterView";

/* =============================================
   STYLES (cleaner “app” look)
============================================= */

const ui = {
  page: (drawerWidth: number): React.CSSProperties => ({
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 20% -10%, #141414 0%, #070707 60%)",
    color: "#e8e8e8",
    padding: 16,
    paddingRight: drawerWidth + 16,
    boxSizing: "border-box",
  }),

  container: {
    maxWidth: 1140,
    margin: "0 auto",
  } as React.CSSProperties,

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    padding: "10px 12px",
    marginBottom: 12,
    border: "1px solid #1c1c1c",
    background: "rgba(10,10,10,0.88)",
    backdropFilter: "blur(10px)",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
  } as React.CSSProperties,

  headerLeft: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 18,
    letterSpacing: 0.2,
    fontWeight: 900,
  } as React.CSSProperties,

  metaLine: {
    opacity: 0.75,
    fontSize: 12,
  } as React.CSSProperties,

  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  } as React.CSSProperties,

  pill: (
    tone:
      | "gray"
      | "green"
      | "gold"
      | "blue"
      | "red"
      | "purple" = "gray"
  ): React.CSSProperties => {
    const palette =
      tone === "green"
        ? { bg: "#081b10", border: "#0a3b20", text: "#00ff88" }
        : tone === "red"
        ? { bg: "#2b1111", border: "#3a1616", text: "#ff8888" }
        : tone === "gold"
        ? { bg: "#2b230f", border: "#3a2c08", text: "#ffdd66" }
        : tone === "blue"
        ? { bg: "#0f1d2b", border: "#223a55", text: "#9ad0ff" }
        : tone === "purple"
        ? { bg: "#1d102b", border: "#342255", text: "#d3b3ff" }
        : { bg: "#101010", border: "#222", text: "#ddd" };

    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: `1px solid ${palette.border}`,
      background: palette.bg,
      color: palette.text,
      whiteSpace: "nowrap",
    };
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    gap: 12,
    alignItems: "start",
  } as React.CSSProperties,

  col: {
    display: "grid",
    gap: 12,
  } as React.CSSProperties,

  card: {
    border: "1px solid #1c1c1c",
    background: "linear-gradient(180deg, #0b0b0b 0%, #090909 100%)",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  } as React.CSSProperties,

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  } as React.CSSProperties,

  cardTitle: {
    fontWeight: 900,
    fontSize: 13,
    opacity: 0.95,
    letterSpacing: 0.2,
  } as React.CSSProperties,

  cardSubtle: {
    opacity: 0.7,
    fontSize: 12,
  } as React.CSSProperties,

  divider: {
    height: 1,
    background: "#161616",
    margin: "12px 0",
  } as React.CSSProperties,

  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  } as React.CSSProperties,

  btn: (
    tone: "neutral" | "primary" | "gold" | "green" | "danger" = "neutral"
  ): React.CSSProperties => {
    const base: React.CSSProperties = {
      background: "#111",
      color: "#ddd",
      border: "1px solid #2a2a2a",
      padding: "7px 10px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      letterSpacing: 0.2,
    };

    if (tone === "primary") {
      base.background = "#0f1d2b";
      base.border = "1px solid #223a55";
      base.color = "#aee";
    }
    if (tone === "gold") {
      base.background = "#1b1606";
      base.border = "1px solid #3a2c08";
      base.color = "#ffdd66";
    }
    if (tone === "green") {
      base.background = "#081b10";
      base.border = "1px solid #0a3b20";
      base.color = "#00ff88";
    }
    if (tone === "danger") {
      base.background = "#1b0a0a";
      base.border = "1px solid #3a1616";
      base.color = "#ff8888";
    }

    return base;
  },

  // Drawer overlay
  overlayRoot: {
    position: "fixed",
    inset: 0,
    zIndex: 999999,
    pointerEvents: "none",
  } as React.CSSProperties,

  drawer: (open: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    right: 0,
    height: "100%",
    width: open ? 420 : 52,
    background: "#0b0b0b",
    borderLeft: "1px solid #1f1f1f",
    boxShadow: "-12px 0 40px rgba(0,0,0,0.70)",
    transition: "width 0.2s ease",
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
  }),

  drawerHeader: {
    padding: 10,
    borderBottom: "1px solid #1b1b1b",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  } as React.CSSProperties,

  drawerTitle: {
    color: "#fff",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.2,
  } as React.CSSProperties,

  drawerToggle: {
    background: "#111",
    color: "#fff",
    border: "1px solid #2a2a2a",
    padding: "5px 8px",
    cursor: "pointer",
    fontSize: 12,
    borderRadius: 10,
    fontWeight: 900,
  } as React.CSSProperties,
};

type DispatchFn = (action: Action) => void;

/* =============================================
   SMALL HELPERS (FRONT OFFICE BAR)
============================================= */

function moneyM(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(1)}M`;
}

export function DevLeagueHarness() {
  const [state, setState] = useState<LeagueState | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(true);

  const drawerWidth = overlayOpen ? 420 : 52;

  /* --------------------------------------------
     REDUCER DISPATCH WRAPPER (TYPED)
  -------------------------------------------- */
  const dispatch: DispatchFn = (action) => {
    setState((prev) => {
      if (!prev) return prev;
      return reducer(prev, action);
    });
  };

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
     AUTO-FILL ROSTERS (DEV HACK)
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

  /* ============================================
     ✅ STICKY FRONT OFFICE BAR (RENDER HELPERS)
     - NO hooks inside
     - Works for empty state / team select / main app
  ============================================ */

  function renderFrontOfficeBar(opts: { mode: "EMPTY" | "TEAM_SELECT" | "MAIN" }) {
    const mode = opts.mode;

    if (!state) {
      return (
        <div style={ui.header}>
          <div style={ui.headerLeft}>
            <h2 style={ui.title}>⚾ GM Sandbox</h2>
            <span style={ui.metaLine}>Simulation-first dev harness</span>
          </div>

          <div style={ui.headerRight}>
            <span style={ui.pill("gray")}>No league loaded</span>
            <button style={ui.btn("primary")} onClick={createLeague}>
              Create League
            </button>
          </div>
        </div>
      );
    }

    const userTeamId = state.meta.userTeamId as EntityId | null;

    // Payroll + roster counts only make sense when user team chosen
    let payroll: ReturnType<typeof computeTeamPayroll> | null = null;
    let roster: ReturnType<typeof deriveRosterView> | null = null;

    if (userTeamId) {
      payroll = computeTeamPayroll(state, userTeamId);
      roster = deriveRosterView(state, userTeamId);
    }

    const spaceTone =
      payroll && payroll.space < 0
        ? "red"
        : payroll && payroll.space < 10
        ? "gold"
        : "green";

    return (
      <div style={ui.header}>
        <div style={ui.headerLeft}>
          <h2 style={ui.title}>⚾ GM Sandbox</h2>
          <span style={ui.metaLine}>
            {mode === "TEAM_SELECT" ? "Select your team to begin" : "Front office view"}
          </span>
        </div>

        <div style={ui.headerRight}>
          <span style={ui.pill("blue")}>Phase: {state.meta.phase}</span>

          {userTeamId ? (
            <>
              {payroll ? (
                <>
                  <span style={ui.pill("gray")}>Budget {moneyM(payroll.budget)}</span>
                  <span style={ui.pill("gray")}>Payroll {moneyM(payroll.totalPayroll)}</span>
                  <span style={ui.pill(spaceTone as any)}>Space {moneyM(payroll.space)}</span>
               </>
              ) : null}

              {roster ? (
                <>
                  <span style={ui.pill("purple")}>26: {roster.counts.active26}/26</span>
                  <span style={ui.pill("purple")}>40: {roster.counts.fortyMan}/40</span>
                  <span style={ui.pill("purple")}>AAA: {roster.counts.aaa}</span>
                </>
              ) : null}
            </>
          ) : (
            <span style={ui.pill("gray")}>No user team</span>
          )}
 
          {/* Quick actions: always visible */}
          <button
            style={ui.btn("primary")}
            onClick={() => dispatch({ type: "PROJECT_ALL_PLAYERS" } as Action)}
            title="One-shot: compute and cache projections for every player"
          >
          🔮 Project
        </button>

          {/* ✅ NEW: one-shot cleanup for legacy dollar contracts */}
          <button
            style={ui.btn("neutral")}
            onClick={() => dispatch({ type: "NORMALIZE_CONTRACT_UNITS" } as Action)}
            title="Convert any legacy contract money fields from dollars to $M"
          >
            🧽 Normalize $ Units
          </button>

          {state.meta.phase === "OFFSEASON" ? (
            <button
              style={ui.btn("green")}
              onClick={advanceOffseasonDay}
              title="Advance one offseason day (AI signs + revalue)"
            >
              ➡ Day
            </button>
          ) : null}

          <button style={ui.btn("neutral")} onClick={autoFillAllRosters}>
            Auto-Fill
          </button>

          <button
            style={ui.btn("danger")}
            onClick={createLeague}
            title="Reset league state"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------
     EMPTY STATE
  -------------------------------------------- */
  if (!state) {
    return (
      <div style={ui.page(drawerWidth)}>
        <div style={ui.container}>
          {renderFrontOfficeBar({ mode: "EMPTY" })}

          <div style={ui.card}>
            <div style={ui.cardHeader}>
              <div>
                <div style={ui.cardTitle}>Setup</div>
                <div style={ui.cardSubtle}>Generate a full league state</div>
              </div>
            </div>

            <div style={ui.row}>
              <button style={ui.btn("primary")} onClick={createLeague}>
                Create Full Dev League
              </button>
            </div>
          </div>
        </div>

        {/* Drawer still exists even on empty state */}
        <div style={ui.overlayRoot}>
          <div style={ui.drawer(overlayOpen)}>
            <div style={ui.drawerHeader}>
              <div style={ui.drawerTitle}>
                {overlayOpen ? "PLAYER PANEL" : ""}
              </div>
              <button
                onClick={() => setOverlayOpen((v) => !v)}
                style={ui.drawerToggle}
              >
                {overlayOpen ? "→" : "←"}
              </button>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------
     TEAM SELECTION (WRAPPED)
  -------------------------------------------- */
  if (!state.meta.userTeamId) {
    return (
      <div style={ui.page(drawerWidth)}>
        <div style={ui.container}>
          {renderFrontOfficeBar({ mode: "TEAM_SELECT" })}

          <div style={ui.card}>
            <TeamSelectionScreen state={state} setState={setState} />
          </div>
        </div>

        <div style={ui.overlayRoot}>
          <div style={ui.drawer(overlayOpen)}>
            <div style={ui.drawerHeader}>
              <div style={ui.drawerTitle}>
                {overlayOpen ? "PLAYER PANEL" : ""}
              </div>
              <button
                onClick={() => setOverlayOpen((v) => !v)}
                style={ui.drawerToggle}
              >
                {overlayOpen ? "→" : "←"}
              </button>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    );
  }

  const seasonId = state.pointers.seasonId as EntityId | undefined;
  const season = seasonId ? state.seasons[seasonId] : null;

  /* --------------------------------------------
     BASE APP
  -------------------------------------------- */
  return (
    <div style={ui.page(drawerWidth)}>
      <div style={ui.container}>
        {renderFrontOfficeBar({ mode: "MAIN" })}

        {/* Two-column layout */}
        <div style={ui.grid}>
          {/* LEFT COLUMN */}
          <div style={ui.col}>
            {/* User Team */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>User Team</div>
                  <div style={ui.cardSubtle}>
                    Roster health + phase gating lives here
                  </div>
                </div>
              </div>
              <FrontOfficeInboxPanel state={state} dispatch={dispatch} />
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

            {/* Dev Controls */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>Dev Controls</div>
                  <div style={ui.cardSubtle}>
                    Fast iteration tools (safe to keep)
                  </div>
                </div>
              </div>

              <div style={ui.row}>
                <button style={ui.btn("neutral")} onClick={simSeason}>
                  Sim Full Season
                </button>

                <button
                  style={ui.btn("primary")}
                  onClick={() =>
                    dispatch({ type: "PROJECT_ALL_PLAYERS" } as Action)
                  }
                  title="One-shot: compute and cache projections for every player"
                >
                  🔮 Project All Players
                </button>

                <button style={ui.btn("neutral")} onClick={autoFillAllRosters}>
                  Auto-Fill Rosters
                </button>

                <button style={ui.btn("gold")} onClick={forceTrade}>
                  🧪 Force Trade
                </button>

                {state.meta.phase === "OFFSEASON" && (
                  <button style={ui.btn("green")} onClick={advanceOffseasonDay}>
                    ➡ Advance Offseason Day
                  </button>
                )}
              </div>
            </div>

            {/* Trades */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>Trades</div>
                  <div style={ui.cardSubtle}>Propose + inbox</div>
                </div>
              </div>

              <DevTradeOfferBuilder state={state} dispatch={dispatch} />
              <div style={ui.divider} />
              <DevTradeInbox state={state} setState={setState} />
            </div>

            {/* Roster Dashboard */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>Roster</div>
                  <div style={ui.cardSubtle}>
                    26/40/AAA + depth chart controls
                  </div>
                </div>
              </div>

              <UserTeamRosterDashboard state={state} dispatch={dispatch} />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={ui.col}>
            {/* Season */}
            {season ? (
              <div style={ui.card}>
                <div style={ui.cardHeader}>
                  <div>
                    <div style={ui.cardTitle}>Season</div>
                    <div style={ui.cardSubtle}>
                      Progress + standings hooks
                    </div>
                  </div>
                </div>
                <DevSeasonProgress state={state} />
              </div>
            ) : null}

            {/* Games */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>Games</div>
                  <div style={ui.cardSubtle}>Schedule list + results</div>
                </div>
              </div>
              <DevGameList state={state} />
            </div>

            {/* Batch sim */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>Batch Sim</div>
                  <div style={ui.cardSubtle}>Run chunks safely</div>
                </div>
              </div>
              <DevBatchSimControls state={state} setState={setState} />
            </div>

            {/* Stats */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>Season Stats</div>
                  <div style={ui.cardSubtle}>Quick verification panel</div>
                </div>
              </div>
              <DevPlayerSeasonStats state={state} />
            </div>

            {/* Free Agency */}
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <div style={ui.cardTitle}>Free Agency</div>
                  <div style={ui.cardSubtle}>
                    Offer → sign (selected FA)
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <DevFreeAgentOfferPanel state={state} dispatch={dispatch} />
              </div>

              <div style={ui.row}>
                <DevSignFreeAgent state={state} dispatch={dispatch} />
                <ReleasePlayerButton state={state} dispatch={dispatch} />
              </div>

              <div style={ui.divider} />
              <DevFreeAgentBoard state={state} dispatch={dispatch} />
            </div>
          </div>
        </div>
      </div>

      {/* FIXED RIGHT DRAWER (player panel) */}
      <div style={ui.overlayRoot}>
        <div style={ui.drawer(overlayOpen)}>
          <div style={ui.drawerHeader}>
            <div style={ui.drawerTitle}>
              {overlayOpen ? "PLAYER PANEL" : ""}
            </div>
            <button
              onClick={() => setOverlayOpen((v) => !v)}
              style={ui.drawerToggle}
            >
              {overlayOpen ? "→" : "←"}
            </button>
          </div>

          {overlayOpen ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <PlayerSidebar state={state} dispatch={dispatch} />
              <div style={{ borderTop: "1px solid #1b1b1b", padding: 10 }}>
                <PlayerProfileCard state={state} dispatch={dispatch} />
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