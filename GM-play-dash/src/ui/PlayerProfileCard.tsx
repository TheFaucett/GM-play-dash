import React, { useMemo } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Player } from "../engine/types/player";
import type { Action } from "../engine/actions/types";

import { describePlayer } from "../engine/sim/describePlayer";
import { assignFieldingPositions } from "../engine/sim/assignFieldingPositions";
import { getBatterAttributes, getPitcherAttributes } from "../engine/sim/deriveAttributes";
import { derivePlayerProjection } from "../engine/sim/derivePlayerProjections";
import { getRosterStatus } from "../engine/sim/getRosterStatus";

// ✅ NEW
import { derivePlayerNarrative } from "../engine/sim/derivePlayerNarrative";

/* ================================================
   HELPERS
================================================ */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Converts a 0–100-ish attribute into MLB 20–80 scouting scale.
 * This is a soft mapping, tune later.
 */
function to20_80(raw: number): number {
  const v = clamp(raw, 0, 100);

  // 50 = average
  // 20 = terrible
  // 80 = elite
  const scaled = 20 + (v / 100) * 60;

  // Round to nearest 5 like real scouting grades
  return Math.round(scaled / 5) * 5;
}

function getTagColor(tag: string): {
  bg: string;
  border: string;
  text: string;
} {
  const lower = tag.toLowerCase();

  // -----------------------------
  // WEAKNESSES (RED)
  // -----------------------------
  if (
    lower.includes("whiff") ||
    lower.includes("risk") ||
    lower.includes("liability") ||
    lower.includes("wild") ||
    lower.includes("shaky") ||
    lower.includes("aggressive") ||
    lower.includes("variance") ||
    lower.includes("low power")
  ) {
    return {
      bg: "#2b1111",
      border: "#ff4444",
      text: "#ff8888",
    };
  }

  // -----------------------------
  // SUPERSTAR / CEILING (GOLD)
  // -----------------------------
  if (
    lower.includes("mvp") ||
    lower.includes("franchise") ||
    lower.includes("70-grade") ||
    lower.includes("40–70 hr") ||
    lower.includes("40-70 hr") ||
    lower.includes("ace") ||
    lower.includes("elite")
  ) {
    return {
      bg: "#2b230f",
      border: "#ffcc00",
      text: "#ffdd66",
    };
  }

  // -----------------------------
  // ARCHETYPE / ROLE (BLUE)
  // -----------------------------
  if (
    lower.includes("starter") ||
    lower.includes("reliever") ||
    lower.includes("profile") ||
    lower === "cf" ||
    lower === "ss" ||
    lower === "2b" ||
    lower === "3b" ||
    lower === "1b" ||
    lower === "c" ||
    lower === "lf" ||
    lower === "rf" ||
    lower.includes("command") ||
    lower.includes("stuff") ||
    lower.includes("movement")
  ) {
    return {
      bg: "#0f1d2b",
      border: "#55aaff",
      text: "#99ccff",
    };
  }

  // -----------------------------
  // STRENGTHS (GREEN DEFAULT)
  // -----------------------------
  return {
    bg: "#112b11",
    border: "#00ff88",
    text: "#88ffbb",
  };
}

function fmt3(n: number) {
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

function pct(n: number) {
  return `${Math.round(n * 1000) / 10}%`;
}

/* ================================================
   TYPES
================================================ */

type Props = {
  state: LeagueState;
  dispatch: (a: Action) => void;
};

type GradeRow = {
  label: string;
  grade: number; // 20–80
};

/* ================================================
   UI HELPERS
================================================ */

function rosterBadge(text: string, tone: "green" | "yellow" | "red" | "gray" = "gray") {
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
        marginLeft: 8,
      }}
    >
      {text}
    </span>
  );
}

function rosterButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    background: enabled ? "#111" : "#0d0d0d",
    color: enabled ? "#ddd" : "#555",
    border: "1px solid #333",
    padding: "6px 10px",
    borderRadius: 10,
    cursor: enabled ? "pointer" : "not-allowed",
    fontWeight: 800,
    fontSize: 12,
  };
}

/* ================================================
   MAIN COMPONENT
================================================ */

export function PlayerProfileCard({ state, dispatch }: Props) {
  const selectedPlayerId =
    (state.pointers as any).selectedPlayerId as EntityId | undefined;

  const player: Player | null = selectedPlayerId
    ? (state.players[selectedPlayerId] as any) ?? null
    : null;

  const team =
    player && player.teamId && player.teamId !== "FA"
      ? state.teams[player.teamId]
      : null;

  const seasonId = state.pointers.seasonId as EntityId | undefined;

  const identity = useMemo(() => {
    if (!player) return null;
    return describePlayer(player);
  }, [player]);

  const scoutingGrades: GradeRow[] = useMemo(() => {
    if (!player) return [];

    // -----------------------------------------
    // BATTER GRADES
    // -----------------------------------------
    if (player.role === "BAT") {
      const attrs = getBatterAttributes(player);

      const runRaw = player.latents?.common?.athleticism ?? 50;

      // Fielding proxy from your existing system
      const fielding = player.latents
        ? (assignFieldingPositions(player.latents) as any)
        : null;

      const armRaw = fielding?.ratings?.arm ?? fielding?.arm ?? 50;
      const fieldRaw =
        fielding?.ratings?.fielding ?? fielding?.fielding ?? 50;

      // Overall proxy (tune later)
      const overallRaw =
        attrs.contact * 0.35 +
        attrs.power * 0.35 +
        attrs.discipline * 0.2 +
        runRaw * 0.1;

      return [
        { label: "Hit", grade: to20_80(attrs.contact) },
        { label: "Power", grade: to20_80(attrs.power) },
        { label: "Run", grade: to20_80(runRaw) },
        { label: "Arm", grade: to20_80(armRaw) },
        { label: "Field", grade: to20_80(fieldRaw) },
        { label: "Overall", grade: to20_80(overallRaw) },
      ];
    }

    // -----------------------------------------
    // PITCHER GRADES
    // -----------------------------------------
    const attrs = getPitcherAttributes(player);

    const overallRaw =
      attrs.stuff * 0.45 +
      attrs.control * 0.35 +
      attrs.movement * 0.2;

    return [
      { label: "Stuff", grade: to20_80(attrs.stuff) },
      { label: "Command", grade: to20_80(attrs.control) },
      { label: "Movement", grade: to20_80(attrs.movement) },
      { label: "Stamina", grade: to20_80(attrs.stamina) },
      {
        label: "Durability",
        grade: to20_80(player.latents?.common?.consistency ?? 50),
      },
      { label: "Overall", grade: to20_80(overallRaw) },
    ];
  }, [player]);

  const projection = useMemo(() => {
    if (!player) return null;

    const asOfYear = seasonId ? state.seasons[seasonId]?.year : undefined;
    return derivePlayerProjection(player, asOfYear);
  }, [player, seasonId, state.seasons]);

  const narrative = useMemo(() => {
    // ✅ Narrative is season-contextual; if no season yet, just skip.
    if (!player || !seasonId) return null;

    // Derived, deterministic. Uses narrativeCache + totals if present.
    return derivePlayerNarrative(state, seasonId, player.id as EntityId);
  }, [player, seasonId, state]);

  const roster = useMemo(() => {
    if (!player) return null;
    return getRosterStatus(player);
  }, [player]);

  const canRosterMove = !!player && player.teamId !== ("FA" as any);

  const on40 = roster?.on40 ?? false;
  const optRemain = roster?.optionYearsRemaining ?? 0;
  const optUsed = roster?.optionUsedThisYear ?? false;

  const rosterTone: "green" | "yellow" | "red" | "gray" =
    player?.level === "MLB"
      ? on40
        ? "green"
        : "red"
      : player?.level === "AAA"
      ? on40
        ? "yellow"
        : "gray"
      : "gray";

  // -----------------------------------------
  // EMPTY STATE
  // -----------------------------------------

  if (!player) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>👤 Player Profile</h2>
        <p style={{ opacity: 0.75 }}>
          Select a player from the roster sidebar.
        </p>
      </div>
    );
  }

  // -----------------------------------------
  // MAIN RENDER
  // -----------------------------------------

  return (
    <div style={{ padding: 16 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>{identity?.headline ?? "Player"}</h2>

          <span style={{ opacity: 0.7 }}>
            {player.role} • Age {player.age}
          </span>

          {roster
            ? rosterBadge(
                `${player.level} • ${on40 ? "On 40" : "Not on 40"}`,
                rosterTone
              )
            : null}
        </div>

        <div style={{ marginTop: 6, opacity: 0.75 }}>
          <strong>ID:</strong> {player.id}{" "}
          {team ? (
            <>
              • <strong>Team:</strong> {team.name}
            </>
          ) : (
            <>
              • <strong>Team:</strong> Free Agent
            </>
          )}
        </div>
      </div>

      {/* ✅ NARRATIVE PANEL (NEW) */}
      {narrative ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #333",
            background: "#0b0b0b",
            marginBottom: 16,
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>
              🗞️ Season Narrative{" "}
              <span style={{ opacity: 0.7, fontWeight: 600 }}>
                {narrative.asOfYear ? `• ${narrative.asOfYear}` : ""}
                {typeof narrative.asOfDay === "number" ? ` • Day ${narrative.asOfDay}` : ""}
              </span>
            </div>

            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Confidence {Math.round((narrative.confidence ?? 0) * 100)}%
            </div>
          </div>

          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {narrative.headline}
          </div>

          {narrative.bullets?.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {narrative.bullets.slice(0, 6).map((b) => (
                <span
                  key={b}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    border: "1px solid #222",
                    background: "#101010",
                    color: "#ddd",
                    fontWeight: 800,
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.35 }}>
            {narrative.paragraph}
          </div>
        </div>
      ) : null}

      {/* ROSTER CONTROLS */}
      {roster ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #333",
            background: "#0b0b0b",
            marginBottom: 16,
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📋 Roster Status</div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", opacity: 0.95 }}>
            <div>
              <b>Level</b> {player.level}
            </div>
            <div>
              <b>40-man</b> {on40 ? "Yes" : "No"}
            </div>
            <div>
              <b>Options</b> {optRemain}
            </div>
            <div>
              <b>Option used</b> {optUsed ? "Yes" : "No"}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={rosterButtonStyle(canRosterMove)}
              disabled={!canRosterMove}
              onClick={() =>
                dispatch({
                  type: "ROSTER_MOVE",
                  payload: { move: { type: "ADD_TO_40", playerId: player.id } },
                } as Action)
              }
              title="Adds player to 40-man roster (if space)"
            >
              Add to 40
            </button>

            <button
              style={rosterButtonStyle(canRosterMove)}
              disabled={!canRosterMove}
              onClick={() =>
                dispatch({
                  type: "ROSTER_MOVE",
                  payload: {
                    move: { type: "REMOVE_FROM_40", playerId: player.id },
                  },
                } as Action)
              }
              title="Removes player from 40-man (DFA-lite). If MLB, pushes to AAA."
            >
              Remove from 40
            </button>

            <button
              style={rosterButtonStyle(canRosterMove)}
              disabled={!canRosterMove}
              onClick={() =>
                dispatch({
                  type: "ROSTER_MOVE",
                  payload: {
                    move: { type: "PROMOTE_TO_MLB", playerId: player.id },
                  },
                } as Action)
              }
              title="Promote to MLB (requires on 40-man + 26-man space)"
            >
              Promote MLB
            </button>

            <button
              style={rosterButtonStyle(canRosterMove)}
              disabled={!canRosterMove}
              onClick={() =>
                dispatch({
                  type: "ROSTER_MOVE",
                  payload: {
                    move: { type: "DEMOTE_TO_AAA", playerId: player.id },
                  },
                } as Action)
              }
              title="Demote to AAA (consumes option; blocks if no options)"
            >
              Demote AAA
            </button>
          </div>

          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
            Illegal moves won’t apply; check your log for <b>ROSTER_MOVE_FAILED</b>.
          </div>
        </div>
      ) : null}

      {/* PROJECTION PANEL */}
      {projection ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #333",
            background: "#0b0b0b",
            marginBottom: 16,
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            🔮 Projection{" "}
            <span style={{ opacity: 0.75, fontWeight: 500 }}>
              {projection.asOfYear ? `• ${projection.asOfYear}` : ""}
            </span>
          </div>

          {projection.batting ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <b>Slash:</b>{" "}
                {fmt3(projection.batting.AVG)}/
                {fmt3(projection.batting.OBP)}/
                {fmt3(projection.batting.SLG)}{" "}
                <span style={{ opacity: 0.8 }}>
                  (OPS {fmt3(projection.batting.OPS)})
                </span>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <b>HR</b> {projection.batting.HR}
                </div>
                <div>
                  <b>H</b> {projection.batting.H}
                </div>
                <div>
                  <b>BB</b> {projection.batting.BB}
                </div>
                <div>
                  <b>K</b> {projection.batting.SO}
                </div>
                <div>
                  <b>PA</b> {projection.batting.pa}
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  opacity: 0.9,
                }}
              >
                <div>
                  <b>BB%</b> {pct(projection.batting.BBpct)}
                </div>
                <div>
                  <b>K%</b> {pct(projection.batting.Kpct)}
                </div>
                <div>
                  <b>HR%</b> {pct(projection.batting.HRpct)}
                </div>
                <div>
                  <b>BABIP</b> {fmt3(projection.batting.BABIP)}
                </div>
              </div>
            </>
          ) : null}

          {projection.pitching ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <b>ERA:</b> {projection.pitching.ERA.toFixed(2)}{" "}
                <span style={{ opacity: 0.8 }}>
                  • WHIP {projection.pitching.WHIP.toFixed(2)}
                </span>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <b>IP</b> {projection.pitching.ip}
                </div>
                <div>
                  <b>K/9</b> {projection.pitching.K9.toFixed(1)}
                </div>
                <div>
                  <b>BB/9</b> {projection.pitching.BB9.toFixed(1)}
                </div>
                <div>
                  <b>HR/9</b> {projection.pitching.HR9.toFixed(1)}
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  opacity: 0.9,
                }}
              >
                <div>
                  <b>K%</b> {pct(projection.pitching.Kpct)}
                </div>
                <div>
                  <b>BB%</b> {pct(projection.pitching.BBpct)}
                </div>
                <div>
                  <b>HR%</b> {pct(projection.pitching.HRpct)}
                </div>
                <div>
                  <b>BABIP</b> {fmt3(projection.pitching.BABIP)}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* TAG PILLS */}
      {identity?.tags?.length ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {identity.tags.map((tag) => {
            const colors = getTagColor(tag);
            return (
              <span
                key={tag}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.text,
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* SUMMARY */}
      {identity?.summary ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #333",
            background: "#0b0b0b",
            marginBottom: 18,
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            📝 Scouting Summary
          </div>

          <div>
            {identity && (
              <div style={{ padding: 16 }}>
                <h2>{identity.headline}</h2>
                <p style={{ opacity: 0.8 }}>{identity.summary}</p>

                <section>
                  <h3>Scouting Overview</h3>
                  <p>{identity.report.overview}</p>
                </section>

                <section>
                  <h3>Strengths</h3>
                  <ul>
                    {identity.report.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Weaknesses / Opponent Gameplan</h3>
                  <ul>
                    {identity.report.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Usage & Role</h3>
                  <ul>
                    {identity.report.usage.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Risk Profile</h3>
                  <ul>
                    {identity.report.risk.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Contract Analysis</h3>
                  <ul>
                    {identity.report.contract.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3>Front Office Notes</h3>
                  <ul>
                    {identity.report.gmNotes.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>

          <div style={{ opacity: 0.9, lineHeight: 1.4 }}>
            {identity.summary}
          </div>
        </div>
      ) : null}

      {/* SCOUTING GRADES PANEL */}
      <div
        style={{
          padding: 12,
          border: "1px solid #333",
          background: "#0b0b0b",
          borderRadius: 8,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          📊 Scouting Grades (20–80)
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {scoutingGrades.map((row) => (
            <div
              key={row.label}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 60px",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ opacity: 0.85 }}>{row.label}</div>

              {/* BAR */}
              <div
                style={{
                  height: 10,
                  borderRadius: 6,
                  background: "#111",
                  border: "1px solid #222",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${((row.grade - 20) / 60) * 100}%`,
                    background: "#00ff88",
                  }}
                />
              </div>

              {/* NUMBER */}
              <div style={{ textAlign: "right", fontWeight: 700 }}>
                {row.grade}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RAW DEBUG (OPTIONAL, KEEP FOR NOW) */}
      <pre
        style={{
          marginTop: 18,
          padding: 12,
          background: "#050505",
          border: "1px solid #222",
          borderRadius: 8,
          overflowX: "auto",
          fontSize: 11,
          opacity: 0.9,
        }}
      >
        {JSON.stringify(player, null, 2)}
      </pre>
    </div>
  );
}