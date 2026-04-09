import React, { useMemo, useState } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Player } from "../engine/types/player";
import type { Action } from "../engine/actions/types";

import {
  derivePlayerProjection,
  type PlayerProjection,
} from "../engine/sim/derivePlayerProjections";

import { computeTeamPayroll } from "../engine/sim/computeTeamPayroll";

function fmt3(n: number) {
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

type Row = { p: Player; proj: PlayerProjection; overall: number };
type RoleFilter = "ALL" | "BAT" | "SP" | "RP" | "CL";
type RankMode = "STATCAST" | "OVERALL" | "VALUE";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function estAavFromOverall(overall: number, role: Player["role"]) {
  // Simple v1 “marketish” mapping. Tune later.
  const base = role === "BAT" ? overall * 0.35 - 6 : overall * 0.32 - 5;
  return clamp(Math.round(base), 1, 35);
}

// Normalize helpers
function norm(n: number, min: number, max: number) {
  return clamp((n - min) / (max - min), 0, 1);
}
function invNorm(n: number, min: number, max: number) {
  return 1 - norm(n, min, max);
}

function statcastScore(row: Row): number {
  const { p, proj, overall } = row;
  if (!proj) return overall ?? 0;

  if (p.role === "BAT" && proj.batting) {
    const b = proj.batting;

    const ops01 = norm(b.OPS, 0.62, 1.05);
    const hr01 = norm(b.HRpct, 0.01, 0.08);
    const bb01 = norm(b.BBpct, 0.04, 0.16);
    const kInv01 = invNorm(b.Kpct, 0.12, 0.38);

    const score01 = 0.46 * ops01 + 0.30 * hr01 + 0.14 * kInv01 + 0.10 * bb01;
    const tie = clamp((overall ?? 0) / 100, 0, 1) * 3;

    return Math.round(score01 * 100 + tie);
  }

  if (proj.pitching) {
    const pit = proj.pitching;

    const k01 = norm(pit.Kpct, 0.14, 0.34);
    const bbInv01 = invNorm(pit.BBpct, 0.04, 0.14);
    const eraInv01 = invNorm(pit.ERA, 2.2, 6.2);
    const whipInv01 = invNorm(pit.WHIP, 0.95, 1.65);
    const hrInv01 = invNorm(pit.HRpct, 0.015, 0.065);

    const score01 =
      0.34 * k01 +
      0.22 * bbInv01 +
      0.22 * eraInv01 +
      0.14 * whipInv01 +
      0.08 * hrInv01;

    const tie = clamp((overall ?? 0) / 100, 0, 1) * 3;

    return Math.round(score01 * 100 + tie);
  }

  return overall ?? 0;
}

function valueScore(row: Row): number {
  const sc = statcastScore(row);
  const aav = estAavFromOverall(row.overall ?? 0, row.p.role);
  return Math.round((sc / Math.max(1, aav)) * 10);
}

function rankValue(row: Row, mode: RankMode): number {
  if (mode === "OVERALL") return row.overall ?? 0;
  if (mode === "VALUE") return valueScore(row);
  return statcastScore(row);
}

function money(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(1)}M`;
}

const styles = {
  section: { marginTop: 16 } as React.CSSProperties,

  headerRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
    flexWrap: "wrap",
  } as React.CSSProperties,

  title: { margin: 0 } as React.CSSProperties,
  subtitle: { opacity: 0.75, fontSize: 12 } as React.CSSProperties,

  pill: (tone: "green" | "red" | "gray" = "gray") =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid #222",
      background:
        tone === "green" ? "#081b10" : tone === "red" ? "#2b1111" : "#101010",
      color: tone === "green" ? "#00ff88" : tone === "red" ? "#ff8888" : "#ddd",
      whiteSpace: "nowrap",
    } as React.CSSProperties),

  selectionCard: {
    border: "1px solid #222",
    borderRadius: 12,
    background: "#0b0b0b",
    padding: 10,
    marginBottom: 10,
  } as React.CSSProperties,

  selectionTop: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,

  selectionName: { fontWeight: 900 } as React.CSSProperties,
  selectionMeta: { opacity: 0.75, fontSize: 12 } as React.CSSProperties,

  presetRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  } as React.CSSProperties,

  presetBtn: (enabled: boolean, tone: "blue" | "gold" | "green") =>
    ({
      padding: "6px 10px",
      borderRadius: 10,
      border: "1px solid #2a2a2a",
      fontWeight: 900,
      fontSize: 12,
      cursor: enabled ? "pointer" : "not-allowed",
      opacity: enabled ? 1 : 0.5,
      background:
        tone === "green"
          ? "#081b10"
          : tone === "gold"
          ? "#1b1606"
          : "#0f1d2b",
      color:
        tone === "green"
          ? "#00ff88"
          : tone === "gold"
          ? "#ffdd66"
          : "#9ad0ff",
    } as React.CSSProperties),

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

  scroll: { maxHeight: 520, overflow: "auto" } as React.CSSProperties,

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

  rowBase: { cursor: "pointer" } as React.CSSProperties,

  row: (i: number, selected: boolean): React.CSSProperties => ({
    background: selected ? "#101a24" : i % 2 === 0 ? "#0b0b0b" : "#0a0a0a",
    outline: selected ? "1px solid #223a55" : "none",
    outlineOffset: selected ? -1 : 0,
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

  name: { fontWeight: 800, color: "#dfefff" } as React.CSSProperties,

  badge: {
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
  const [rankMode, setRankMode] = useState<RankMode>("STATCAST");
  const [affordableOnly, setAffordableOnly] = useState(false);

  const seasonId = state.pointers.seasonId as EntityId | undefined;
  const asOfYear = seasonId ? state.seasons[seasonId]?.year : undefined;

  const userTeamId = state.meta.userTeamId as EntityId | null;
  const canTransact = state.meta.phase === "OFFSEASON" && !!userTeamId;

  const selectedPlayerId =
    (state.pointers as any).selectedPlayerId as EntityId | undefined;

  const payroll = useMemo(() => {
    if (!userTeamId) return null;
    return computeTeamPayroll(state, userTeamId);
  }, [state, userTeamId]);

  const allFreeAgents = useMemo(() => {
    return (Object.values(state.players) as Player[]).filter(
      (p) => p && p.teamId === ("FA" as EntityId)
    );
  }, [state.players]);

  const rows: Row[] = useMemo(() => {
    const filtered =
      roleFilter === "ALL"
        ? allFreeAgents
        : allFreeAgents.filter((p) => p.role === roleFilter);

    const mapped = filtered.map((p) => {
      const cached = (p as unknown as { projection?: PlayerProjection }).projection;
      const proj = cached ?? derivePlayerProjection(p, asOfYear);
      const overall = p.value?.overall ?? 0;
      return { p, proj, overall };
    });

    const withAffordability =
      affordableOnly && payroll
        ? mapped.filter((r) => {
            const estAav = estAavFromOverall(r.overall, r.p.role);
            return payroll.space >= estAav;
          })
        : mapped;

    return withAffordability
      .sort((a, b) => rankValue(b, rankMode) - rankValue(a, rankMode))
      .slice(0, 80);
  }, [allFreeAgents, roleFilter, asOfYear, rankMode, affordableOnly, payroll]);

  const totalFA = allFreeAgents.length;

  const selectedFA: Row | null = useMemo(() => {
    if (!selectedPlayerId) return null;

    const hit = rows.find((r) => r.p.id === selectedPlayerId);
    if (hit) return hit;

    const p = state.players[selectedPlayerId] as Player | undefined;
    if (!p || p.teamId !== ("FA" as EntityId)) return null;

    const cached = (p as unknown as { projection?: PlayerProjection }).projection;
    const proj = cached ?? derivePlayerProjection(p, asOfYear);
    const overall = p.value?.overall ?? 0;
    return { p, proj, overall };
  }, [selectedPlayerId, rows, state.players, asOfYear]);

  function selectPlayer(id: EntityId) {
    dispatch({
      type: "SELECT_PLAYER",
      payload: { playerId: id },
    } as Action);
  }

  function makePresetOffer(preset: "proveit" | "starter" | "cornerstone") {
    if (!selectedFA || !userTeamId) return;

    const p = selectedFA.p;
    const overall = selectedFA.overall;

    const baseAav = estAavFromOverall(overall, p.role);

    const years = preset === "proveit" ? 1 : preset === "starter" ? 3 : 5;

    const aav =
      preset === "proveit"
        ? Math.max(1, Math.round(baseAav * 0.75))
        : preset === "starter"
        ? Math.round(baseAav * 1.05)
        : Math.round(baseAav * 1.35);

    dispatch({
      type: "MAKE_FA_OFFER",
      payload: {
        playerId: p.id,
        teamId: userTeamId,
        years,
        aav,
        targetLevel: "MLB",
        addTo40: true,
      },
    } as any);
  }

  const rankLabel =
    rankMode === "STATCAST" ? "SC+" : rankMode === "VALUE" ? "VAL" : "OVR";

  const spaceTone = payroll ? (payroll.space >= 0 ? "green" : "red") : "gray";

  return (
    <section style={styles.section}>
      <div style={styles.headerRow}>
        <h3 style={styles.title}>🧢 Free Agents</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {payroll ? (
            <>
              <span style={styles.pill("gray")}>
                Budget {money(payroll.budget)}
              </span>
              <span style={styles.pill("gray")}>
                Payroll {money(payroll.totalPayroll)}
              </span>
              <span style={styles.pill(spaceTone)}>
                Space {money(payroll.space)}
              </span>
            </>
          ) : (
            <span style={styles.pill("gray")}>No user team</span>
          )}

          <span style={styles.pill("gray")}>
            Rank {rankLabel}
          </span>

          <span style={styles.pill("gray")}>
            Total {totalFA} • Showing {rows.length}
          </span>
        </div>
      </div>

      {/* Selected FA header + presets */}
      <div style={styles.selectionCard}>
        {selectedFA ? (
          <>
            <div style={styles.selectionTop}>
              <div>
                <div style={styles.selectionName}>
                  Offering to: {selectedFA.p.name}{" "}
                  <span style={{ opacity: 0.75 }}>
                    ({rankLabel} {rankValue(selectedFA, rankMode) || "-"} • OVR{" "}
                    {selectedFA.overall || "-"} • {selectedFA.p.role} • Age{" "}
                    {selectedFA.p.age})
                  </span>
                </div>
                <div style={styles.selectionMeta}>
                  Click a different row below to change selection.
                </div>
              </div>
            </div>

            <div style={styles.presetRow}>
              <button
                style={styles.presetBtn(canTransact, "blue")}
                disabled={!canTransact}
                onClick={() => makePresetOffer("proveit")}
              >
                1y prove-it
              </button>

              <button
                style={styles.presetBtn(canTransact, "gold")}
                disabled={!canTransact}
                onClick={() => makePresetOffer("starter")}
              >
                3y starter
              </button>

              <button
                style={styles.presetBtn(canTransact, "green")}
                disabled={!canTransact}
                onClick={() => makePresetOffer("cornerstone")}
              >
                5y cornerstone
              </button>
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            Select a free agent below to see projections and submit offers.
          </div>
        )}
      </div>

      {/* Filters + Rank toggle */}
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

        <span style={{ opacity: 0.6, margin: "0 6px" }}>•</span>

        {(["STATCAST", "OVERALL", "VALUE"] as RankMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setRankMode(m)}
            style={styles.chip(rankMode === m)}
          >
            {m === "STATCAST" ? "Statcast" : m === "OVERALL" ? "Overall" : "Value"}
          </button>
        ))}

        <span style={{ opacity: 0.6, margin: "0 6px" }}>•</span>

        <button
          onClick={() => setAffordableOnly((v) => !v)}
          style={styles.chip(affordableOnly)}
          title="Filters to players whose estimated AAV fits current payroll space"
        >
          Affordable only
        </button>
      </div>

      <div style={styles.tableWrap}>
        <div style={styles.scroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 74 }}>{rankLabel}</th>
                <th style={{ ...styles.th, width: 70 }}>Action</th>
                <th style={{ ...styles.th, width: 210 }}>Name</th>
                <th style={{ ...styles.th, width: 70 }}>Role</th>
                <th style={{ ...styles.th, width: 52 }}>Age</th>
                <th style={{ ...styles.th, width: 60 }}>Hand</th>
                <th style={{ ...styles.th, width: 90, textAlign: "right" }}>Est AAV</th>
                <th style={{ ...styles.th, width: 210 }}>Proj</th>
                <th style={{ ...styles.th, width: 120 }}>OPS/ERA</th>
                <th style={{ ...styles.th, width: 110 }}>HR/K9</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ p, proj, overall }, i) => {
                const isSelected = p.id === selectedPlayerId;

                const isBatter = p.role === "BAT" && !!proj.batting;
                const isPitcher = p.role !== "BAT" && !!proj.pitching;

                const projLabel = isBatter
                  ? `${fmt3(proj.batting!.AVG)}/${fmt3(proj.batting!.OBP)}/${fmt3(
                      proj.batting!.SLG
                    )}`
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

                const rank = rankValue({ p, proj, overall }, rankMode);
                const estAav = estAavFromOverall(overall, p.role);

                const payrollOk = payroll ? payroll.space >= estAav : false;
                const enabled = canTransact && payrollOk;

                return (
                  <tr
                    key={p.id}
                    style={{ ...styles.rowBase, ...styles.row(i, isSelected) }}
                    onClick={() => selectPlayer(p.id)}
                    title="Click to select"
                  >
                    <td style={{ ...styles.td, ...styles.numeric }}>
                      <span style={styles.badge}>{rank || "-"}</span>
                    </td>

                    <td style={styles.td}>
                      <button
                        style={styles.signBtn(enabled)}
                        disabled={!enabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!userTeamId) return;

                          dispatch({
                            type: "SIGN_FREE_AGENT",
                            payload: { playerId: p.id, toTeamId: userTeamId },
                          } as Action);
                        }}
                        title={
                          !canTransact
                            ? "Only in OFFSEASON + user team set"
                            : !payrollOk
                            ? `Not enough space (need ~$${estAav}M)`
                            : "Sign to user team"
                        }
                      >
                        Sign
                      </button>
                    </td>

                    <td style={{ ...styles.td, ...styles.name }} title={p.name}>
                      {p.name}
                    </td>

                    <td style={styles.td}>{p.role}</td>
                    <td style={{ ...styles.td, ...styles.numeric }}>{p.age}</td>
                    <td style={styles.td}>{p.handedness}</td>

                    <td style={{ ...styles.td, ...styles.numeric, ...styles.mono }}>
                      ${estAav}M
                    </td>

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

      <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
        v1 payroll gating uses estimated AAV from overall. Later, replace with actual offer AAV.
      </div>
    </section>
  );
}