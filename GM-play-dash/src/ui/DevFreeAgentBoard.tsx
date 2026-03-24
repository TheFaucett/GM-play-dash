import React, { useMemo, useState } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Player } from "../engine/types/player";
import type { Action } from "../engine/actions/types";

import {
  derivePlayerProjection,
  type PlayerProjection,
} from "../engine/sim/derivePlayerProjections";

function fmt3(n: number) {
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

type Row = { p: Player; proj: PlayerProjection; overall: number };
type RoleFilter = "ALL" | "BAT" | "SP" | "RP" | "CL";

const styles = {
  section: { marginTop: 16 } as React.CSSProperties,
  headerRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  } as React.CSSProperties,
  title: { margin: 0 } as React.CSSProperties,
  subtitle: { opacity: 0.75, fontSize: 12 } as React.CSSProperties,
  controls: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  } as React.CSSProperties,
  chip: (active: boolean) =>
    ({
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid #222",
      background: active ? "#0f1d2b" : "#0b0b0b",
      color: active ? "#99ccff" : "#bbb",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: 12,
    } as React.CSSProperties),
  tableWrap: {
    border: "1px solid #222",
    borderRadius: 12,
    overflow: "hidden",
    background: "#0b0b0b",
  } as React.CSSProperties,
  scroll: { maxHeight: 460, overflow: "auto" } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 13,
  } as React.CSSProperties,
  th: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    textAlign: "left",
    padding: "10px 10px",
    background: "#111",
    borderBottom: "1px solid #222",
    fontWeight: 800,
    color: "#ddd",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  td: {
    padding: "8px 10px",
    borderBottom: "1px solid #151515",
    color: "#ddd",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  row: (i: number): React.CSSProperties => ({
    background: i % 2 === 0 ? "#0b0b0b" : "#0a0a0a",
  }),
  numeric: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  mono: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  nameButton: {
    background: "transparent",
    border: "none",
    color: "#9ad0ff",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
    font: "inherit",
  } as React.CSSProperties,
  overallBadge: {
    display: "inline-block",
    minWidth: 40,
    textAlign: "right",
    padding: "2px 8px",
    borderRadius: 8,
    border: "1px solid #222",
    background: "#101010",
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  signBtn: (enabled: boolean) =>
    ({
      padding: "5px 10px",
      borderRadius: 10,
      border: "1px solid #2a2a2a",
      background: enabled ? "#081b10" : "#121212",
      color: enabled ? "#00ff88" : "#666",
      fontWeight: 900,
      cursor: enabled ? "pointer" : "not-allowed",
      fontSize: 12,
    } as React.CSSProperties),
};

export function DevFreeAgentBoard({
  state,
  dispatch,
}: {
  state: LeagueState;
  dispatch: React.Dispatch<Action> | ((a: Action) => void);
}) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const seasonId = state.pointers.seasonId as EntityId | undefined;
  const asOfYear = seasonId ? state.seasons[seasonId]?.year : undefined;

  const userTeamId = state.meta.userTeamId as EntityId | null;
  const canSign = state.meta.phase === "OFFSEASON" && !!userTeamId;

  const allFreeAgents = useMemo(() => {
    return (Object.values(state.players) as Player[]).filter(
      (p) => p && p.teamId === ("FA" as EntityId)
    );
  }, [state.players]);

  const totalFA = allFreeAgents.length;

  const rows: Row[] = useMemo(() => {
    const filtered = roleFilter === "ALL"
      ? allFreeAgents
      : allFreeAgents.filter((p) => p.role === roleFilter);

    return filtered
      .map((p) => {
        const cached = (p as unknown as { projection?: PlayerProjection }).projection;
        const proj = cached ?? derivePlayerProjection(p, asOfYear);
        const overall = p.value?.overall ?? 0;
        return { p, proj, overall };
      })
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 60);
  }, [allFreeAgents, roleFilter, asOfYear]);

  return (
    <section style={styles.section}>
      <div style={styles.headerRow}>
        <h3 style={styles.title}>🧢 Free Agents</h3>
        <div style={styles.subtitle}>
          Filter: <b>{roleFilter}</b> • Total: {totalFA} • Showing: {rows.length}
          {!canSign ? " • (Sign disabled outside OFFSEASON)" : ""}
        </div>
      </div>

      <div style={styles.controls}>
        {(["ALL", "BAT", "SP", "RP", "CL"] as RoleFilter[]).map((rf) => (
          <button
            key={rf}
            onClick={() => setRoleFilter(rf)}
            style={styles.chip(roleFilter === rf)}
          >
            {rf}
          </button>
        ))}
      </div>

      <div style={styles.tableWrap}>
        <div style={styles.scroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 74 }}>Overall</th>
                <th style={{ ...styles.th, width: 70 }}>Action</th>
                <th style={{ ...styles.th, width: 190 }}>Name</th>
                <th style={{ ...styles.th, width: 70 }}>Role</th>
                <th style={{ ...styles.th, width: 52 }}>Age</th>
                <th style={{ ...styles.th, width: 60 }}>Hand</th>
                <th style={{ ...styles.th, width: 210 }}>Proj</th>
                <th style={{ ...styles.th, width: 120 }}>OPS/ERA</th>
                <th style={{ ...styles.th, width: 110 }}>HR/K9</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ p, proj, overall }, i) => {
                const isBatter = p.role === "BAT" && !!proj.batting;
                const isPitcher = p.role !== "BAT" && !!proj.pitching;

                const projLabel = isBatter
                  ? `${fmt3(proj.batting!.AVG)}/${fmt3(proj.batting!.OBP)}/${fmt3(proj.batting!.SLG)}`
                  : isPitcher
                  ? `ERA ${proj.pitching!.ERA.toFixed(2)}`
                  : "-";

                const opsEra = isBatter
                  ? `OPS ${fmt3(proj.batting!.OPS)}`
                  : isPitcher
                  ? `WHIP ${proj.pitching!.WHIP.toFixed(2)}`
                  : "-";

                const hrK = isBatter
                  ? `HR ${proj.batting!.HR}`
                  : isPitcher
                  ? `K/9 ${proj.pitching!.K9.toFixed(1)}`
                  : "-";

                const enabled = canSign;

                return (
                  <tr key={p.id} style={styles.row(i)}>
                    <td style={{ ...styles.td, ...styles.numeric }}>
                      <span style={styles.overallBadge}>{overall || "-"}</span>
                    </td>

                    <td style={styles.td}>
                      <button
                        style={styles.signBtn(enabled)}
                        disabled={!enabled}
                        onClick={() => {
                          if (!userTeamId) return;
                          dispatch({
                            type: "SIGN_FREE_AGENT",
                            payload: { playerId: p.id, toTeamId: userTeamId },
                          } as Action);
                        }}
                        title={enabled ? "Sign to user team" : "Only in OFFSEASON + user team set"}
                      >
                        Sign
                      </button>
                    </td>

                    <td style={styles.td} title={p.name}>
                      <button
                        onClick={() =>
                          dispatch({
                            type: "SELECT_PLAYER",
                            payload: { playerId: p.id },
                          } as Action)
                        }
                        style={styles.nameButton}
                        title="Select player (opens right-side panel)"
                      >
                        {p.name}
                      </button>
                    </td>

                    <td style={styles.td}>{p.role}</td>
                    <td style={{ ...styles.td, ...styles.numeric }}>{p.age}</td>
                    <td style={styles.td}>{p.handedness}</td>

                    <td style={{ ...styles.td, ...styles.mono }}>{projLabel}</td>
                    <td style={{ ...styles.td, ...styles.numeric }}>{opsEra}</td>
                    <td style={{ ...styles.td, ...styles.numeric }}>{hrK}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}