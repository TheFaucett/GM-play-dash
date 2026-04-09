import React, { useMemo, useState } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Player } from "../engine/types/player";
import type { Action } from "../engine/actions/types";

import { deriveRosterView } from "../engine/sim/deriveRosterView";
import { validateRosterView } from "../engine/sim/validateRosterView";
import { getRosterStatus } from "../engine/sim/getRosterStatus";
import { derivePlayerProjection } from "../engine/sim/derivePlayerProjections";

function fmt3(n: number) {
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

function badge(text: string, tone: "green" | "yellow" | "red" | "gray" = "gray") {
  const palette =
    tone === "green"
      ? { bg: "#081b10", border: "#0a3b20", text: "#00ff88" }
      : tone === "yellow"
      ? { bg: "#2b230f", border: "#3a2c08", text: "#ffdd66" }
      : tone === "red"
      ? { bg: "#2b1111", border: "#4a1414", text: "#ff8888" }
      : { bg: "#101010", border: "#222", text: "#ddd" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
      }}
    >
      {text}
    </span>
  );
}

function btnStyle(enabled: boolean, tone: "neutral" | "green" | "red" | "yellow" = "neutral") {
  const base: React.CSSProperties = {
    padding: "5px 10px",
    borderRadius: 10,
    border: "1px solid #333",
    fontWeight: 900,
    fontSize: 12,
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.45,
    background: "#111",
    color: "#ddd",
  };

  if (tone === "green") {
    base.background = "#081b10";
    base.border = "1px solid #0a3b20";
    base.color = "#00ff88";
  } else if (tone === "red") {
    base.background = "#2b1111";
    base.border = "1px solid #4a1414";
    base.color = "#ff8888";
  } else if (tone === "yellow") {
    base.background = "#2b230f";
    base.border = "1px solid #3a2c08";
    base.color = "#ffdd66";
  }

  return base;
}

type Props = {
  state: LeagueState;
  dispatch: (a: Action) => void;
};

type SlotGroup = {
  title: string;
  ids: EntityId[];
};

function playerOverall(p: Player) {
  return p.value?.overall ?? 0;
}

function projectionHeadline(p: Player, state: LeagueState) {
  const seasonId = state.pointers.seasonId as EntityId | undefined;
  const asOfYear = seasonId ? state.seasons[seasonId]?.year : undefined;
  const proj = (p as any).projection ?? derivePlayerProjection(p, asOfYear);

  if (p.role === "BAT" && proj?.batting) {
    return `OPS ${fmt3(proj.batting.OPS)} • HR ${proj.batting.HR}`;
  }
  if (proj?.pitching) {
    return `ERA ${proj.pitching.ERA.toFixed(2)} • K/9 ${proj.pitching.K9.toFixed(1)}`;
  }
  return "-";
}

export function UserTeamRosterDashboard({ state, dispatch }: Props) {
  const userTeamId = state.meta.userTeamId as EntityId | null;
  const [search, setSearch] = useState("");

  const team = userTeamId ? state.teams[userTeamId] : null;

  const view = useMemo(() => {
    if (!userTeamId) return null;
    return deriveRosterView(state, userTeamId);
  }, [state, userTeamId]);

  const violations = useMemo(() => {
    if (!userTeamId || !view) return [];
    return validateRosterView(state, view);
  }, [state, userTeamId, view]);

  const depthGroups: SlotGroup[] = useMemo(() => {
    if (!team) return [];

    return [
      { title: "Lineup / Hitters", ids: (team.lineup ?? []) as EntityId[] },
      { title: "Rotation", ids: (team.rotation ?? []) as EntityId[] },
      { title: "Bullpen", ids: (team.bullpen ?? []) as EntityId[] },
    ];
  }, [team]);

  const aaaPool: Player[] = useMemo(() => {
    if (!userTeamId) return [];
    const q = search.trim().toLowerCase();

    return (Object.values(state.players) as Player[])
      .filter((p) => p && p.teamId === userTeamId && p.level === "AAA")
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => playerOverall(b) - playerOverall(a))
      .slice(0, 60);
  }, [state.players, userTeamId, search]);

  if (!userTeamId || !team || !view) {
    return (
      <div
        style={{
          border: "1px solid #222",
          background: "#0b0b0b",
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
        }}
      >
        <div style={{ fontWeight: 900 }}>📋 Roster Dashboard</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Select a user team to manage rosters.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #222",
        background: "#0b0b0b",
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
      }}
    >
      {/* Top strip */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>📋 Roster Dashboard</div>
          {badge(`Active ${view.counts.active26}/26`, view.counts.active26 > 26 ? "red" : "green")}
          {badge(`40-man ${view.counts.fortyMan}/40`, view.counts.fortyMan > 40 ? "red" : "yellow")}
          {badge(`AAA ${view.counts.aaa}`, "gray")}
        </div>

        <div style={{ opacity: 0.8, fontSize: 12 }}>
          Team: <b>{team.name}</b>
        </div>
      </div>

      {/* Violations */}
      {violations.length > 0 ? (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #4a1414",
            background: "#2b1111",
            color: "#ffbbbb",
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>⚠ Roster Issues</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {violations.slice(0, 8).map((v, i) => (
              <li key={i}>
                <b>{v.code}</b> — {v.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, marginTop: 12 }}>
        {/* LEFT: Depth chart */}
        <div
          style={{
            border: "1px solid #222",
            borderRadius: 12,
            overflow: "hidden",
            background: "#090909",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid #1b1b1b", fontWeight: 900 }}>
            Depth Chart
          </div>

          <div style={{ padding: 10, display: "grid", gap: 14 }}>
            {depthGroups.map((group) => (
              <div key={group.title}>
                <div style={{ fontWeight: 900, marginBottom: 8, opacity: 0.9 }}>{group.title}</div>

                <div style={{ display: "grid", gap: 8 }}>
                  {group.ids.length === 0 ? (
                    <div style={{ opacity: 0.6, fontSize: 12 }}>(empty)</div>
                  ) : null}

                  {group.ids.map((id) => {
                    const p = state.players[id] as Player | undefined;
                    if (!p) return null;

                    const r = getRosterStatus(p);
                    const on40 = r.on40;
                    const canPromote = p.level !== "MLB" && on40 && view.counts.active26 < 26;
                    const canDemote = p.level === "MLB"; // actual option check is enforced in reducer
                    const canAdd40 = !on40 && view.counts.fortyMan < 40;
                    const canRemove40 = on40;

                    return (
                      <div
                        key={id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 10,
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #1f1f1f",
                          background: "#0b0b0b",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "SELECT_PLAYER",
                                  payload: { playerId: p.id },
                                } as Action)
                              }
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: "#9ad0ff",
                                fontWeight: 900,
                                textDecoration: "underline",
                                fontSize: 13,
                                textAlign: "left",
                              }}
                              title="Select player (opens right panel)"
                            >
                              {p.name}
                            </button>

                            {badge(p.level, p.level === "MLB" ? "green" : "gray")}
                            {badge(on40 ? "40" : "NR", on40 ? "yellow" : "gray")}
                            {badge(`OVR ${playerOverall(p)}`, "gray")}
                          </div>

                          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                            {projectionHeadline(p, state)}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            style={btnStyle(canAdd40, "yellow")}
                            disabled={!canAdd40}
                            onClick={() =>
                              dispatch({
                                type: "ROSTER_MOVE",
                                payload: { move: { type: "ADD_TO_40", playerId: p.id } },
                              } as Action)
                            }
                            title={canAdd40 ? "Add to 40-man" : "40-man full or already on 40"}
                          >
                            +40
                          </button>

                          <button
                            style={btnStyle(canRemove40, "yellow")}
                            disabled={!canRemove40}
                            onClick={() =>
                              dispatch({
                                type: "ROSTER_MOVE",
                                payload: { move: { type: "REMOVE_FROM_40", playerId: p.id } },
                              } as Action)
                            }
                            title="Remove from 40-man (DFA-lite)"
                          >
                            -40
                          </button>

                          <button
                            style={btnStyle(canPromote, "green")}
                            disabled={!canPromote}
                            onClick={() =>
                              dispatch({
                                type: "ROSTER_MOVE",
                                payload: { move: { type: "PROMOTE_TO_MLB", playerId: p.id } },
                              } as Action)
                            }
                            title={
                              canPromote
                                ? "Promote to MLB"
                                : !on40
                                ? "Must be on 40-man"
                                : "Active roster full"
                            }
                          >
                            ↑MLB
                          </button>

                          <button
                            style={btnStyle(canDemote, "green")}
                            disabled={!canDemote}
                            onClick={() =>
                              dispatch({
                                type: "ROSTER_MOVE",
                                payload: { move: { type: "DEMOTE_TO_AAA", playerId: p.id } },
                              } as Action)
                            }
                            title="Demote to AAA (options enforced in reducer)"
                          >
                            ↓AAA
                          </button>

                          <button
                            style={btnStyle(true, "red")}
                            onClick={() =>
                              dispatch({
                                type: "RELEASE_PLAYER",
                                payload: { playerId: p.id },
                              } as Action)
                            }
                            title="Release player"
                          >
                            Release
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: AAA Pool */}
        <div
          style={{
            border: "1px solid #222",
            borderRadius: 12,
            overflow: "hidden",
            background: "#090909",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid #1b1b1b" }}>
            <div style={{ fontWeight: 900 }}>AAA Pool</div>
            <div style={{ marginTop: 8 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search AAA..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #222",
                  background: "#0b0b0b",
                  color: "#e8e8e8",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: 560, overflow: "auto" }}>
            {aaaPool.length === 0 ? (
              <div style={{ padding: 10, opacity: 0.7 }}>(no AAA players)</div>
            ) : null}

            {aaaPool.map((p) => {
              const r = getRosterStatus(p);
              const on40 = r.on40;
              const canAdd40 = !on40 && view.counts.fortyMan < 40;
              const canPromote = on40 && view.counts.active26 < 26;

              return (
                <div
                  key={p.id}
                  style={{
                    padding: 10,
                    borderBottom: "1px solid #141414",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() =>
                          dispatch({
                            type: "SELECT_PLAYER",
                            payload: { playerId: p.id },
                          } as Action)
                        }
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          color: "#9ad0ff",
                          fontWeight: 900,
                          textDecoration: "underline",
                          fontSize: 13,
                          textAlign: "left",
                        }}
                        title="Select player"
                      >
                        {p.name}
                      </button>

                      {badge("AAA", "gray")}
                      {badge(on40 ? "40" : "NR", on40 ? "yellow" : "gray")}
                      {badge(`OVR ${playerOverall(p)}`, "gray")}
                    </div>

                    <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                      {projectionHeadline(p, state)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      style={btnStyle(canAdd40, "yellow")}
                      disabled={!canAdd40}
                      onClick={() =>
                        dispatch({
                          type: "ROSTER_MOVE",
                          payload: { move: { type: "ADD_TO_40", playerId: p.id } },
                        } as Action)
                      }
                      title={canAdd40 ? "Add to 40-man" : "40-man full or already on 40"}
                    >
                      +40
                    </button>

                    <button
                      style={btnStyle(canPromote, "green")}
                      disabled={!canPromote}
                      onClick={() =>
                        dispatch({
                          type: "ROSTER_MOVE",
                          payload: { move: { type: "PROMOTE_TO_MLB", playerId: p.id } },
                        } as Action)
                      }
                      title={canPromote ? "Promote to MLB" : !on40 ? "Must be on 40-man" : "Active full"}
                    >
                      ↑MLB
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 10, borderTop: "1px solid #141414", opacity: 0.75, fontSize: 12 }}>
            Tip: Add to 40 → Promote MLB. Demotions consume options (enforced by reducer).
          </div>
        </div>
      </div>
    </div>
  );
}