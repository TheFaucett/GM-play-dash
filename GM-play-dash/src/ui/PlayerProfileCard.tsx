import React, { useMemo } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Player } from "../engine/types/player";

import { describePlayer } from "../engine/sim/describePlayer";
import { assignFieldingPositions } from "../engine/sim/assignFieldingPositions";
import { getBatterAttributes, getPitcherAttributes } from "../engine/sim/deriveAttributes";

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

/* ================================================
   TYPES
================================================ */

type Props = {
  state: LeagueState;
};

type GradeRow = {
  label: string;
  grade: number; // 20–80
};

/* ================================================
   MAIN COMPONENT
================================================ */

export function PlayerProfileCard({ state }: Props) {
  const selectedPlayerId =
    (state.pointers as any).selectedPlayerId as EntityId | undefined;

  const player: Player | null = selectedPlayerId
    ? state.players[selectedPlayerId] ?? null
    : null;

  const team =
    player && player.teamId && player.teamId !== "FA"
      ? state.teams[player.teamId]
      : null;

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
      { label: "Durability", grade: to20_80(player.latents?.common?.consistency ?? 50) },
      { label: "Overall", grade: to20_80(overallRaw) },
    ];
  }, [player]);

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
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ margin: 0 }}>{identity?.headline ?? "Player"}</h2>

          <span style={{ opacity: 0.7 }}>
            {player.role} • Age {player.age}
          </span>
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

                {/* OVERVIEW */}
                <section>
                <h3>Scouting Overview</h3>
                <p>{identity.report.overview}</p>
                </section>

                {/* STRENGTHS */}
                <section>
                <h3>Strengths</h3>
                <ul>
                    {identity.report.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                    ))}
                </ul>
                </section>

                {/* WEAKNESSES */}
                <section>
                <h3>Weaknesses / Opponent Gameplan</h3>
                <ul>
                    {identity.report.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                    ))}
                </ul>
                </section>

                {/* USAGE */}
                <section>
                <h3>Usage & Role</h3>
                <ul>
                    {identity.report.usage.map((u, i) => (
                    <li key={i}>{u}</li>
                    ))}
                </ul>
                </section>

                {/* RISK */}
                <section>
                <h3>Risk Profile</h3>
                <ul>
                    {identity.report.risk.map((r, i) => (
                    <li key={i}>{r}</li>
                    ))}
                </ul>
                </section>

                {/* CONTRACT */}
                <section>
                <h3>Contract Analysis</h3>
                <ul>
                    {identity.report.contract.map((c, i) => (
                    <li key={i}>{c}</li>
                    ))}
                </ul>
                </section>

                {/* GM NOTES */}
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
