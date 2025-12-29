import { useState } from "react";
import type {
  PitchType,
  PitchLocation,
  PitchIntent,
} from "../engine/types/pitch";

type Props = {
  disabled?: boolean;
  onCallPitch: (payload: {
    pitchType: PitchType;
    location: PitchLocation;
    intent: PitchIntent;
  }) => void;
};

const PITCH_TYPES: PitchType[] = [
  "FF",
  "SI",
  "CT",
  "SL",
  "SW",
  "CU",
  "KB",
  "CH",
  "SF",
];

const INTENTS: PitchIntent[] = ["attack", "paint", "waste"];

/**
 * 3x3 strike zone grid
 * rows: 0 = high, 1 = middle, 2 = low
 * cols: left → right (unused for now, but preserved)
 */
export function PitchControlPanel({
  disabled,
  onCallPitch,
}: Props) {
  const [pitchType, setPitchType] =
    useState<PitchType>("FF");
  const [intent, setIntent] =
    useState<PitchIntent>("attack");

  const [target, setTarget] = useState<{
    row: number;
    col: number;
  }>({
    row: 1,
    col: 1,
  });

  function resolveLocation(row: number): PitchLocation {
    if (row === 0) return "high";
    if (row === 2) return "low";
    return "middle";
  }

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: 12,
        borderRadius: 6,
        maxWidth: 320,
      }}
    >
      <h3>Call Pitch</h3>

      {/* Pitch Type */}
      <div style={{ marginBottom: 10 }}>
        <strong>Pitch</strong>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 4,
          }}
        >
          {PITCH_TYPES.map((p) => (
            <button
              key={p}
              disabled={disabled}
              onClick={() => setPitchType(p)}
              style={{
                padding: "4px 8px",
                background:
                  pitchType === p ? "#333" : "#eee",
                color:
                  pitchType === p ? "#fff" : "#000",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Strike Zone */}
      <div style={{ marginBottom: 12 }}>
        <strong>Target</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
            width: 120,
            marginTop: 6,
          }}
        >
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => {
              const selected =
                target?.row === row &&
                target?.col === col;

              return (
                <button
                  key={`${row}-${col}`}
                  disabled={disabled}
                  onClick={() => setTarget({ row, col })}
                  style={{
                    width: 36,
                    height: 36,
                    background: selected
                      ? "#444"
                      : "#f0f0f0",
                    border: "1px solid #999",
                    cursor: "pointer",
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Intent */}
      <div style={{ marginBottom: 12 }}>
        <strong>Intent</strong>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {INTENTS.map((i) => (
            <button
              key={i}
              disabled={disabled}
              onClick={() => setIntent(i)}
              style={{
                padding: "4px 8px",
                background:
                  intent === i ? "#333" : "#eee",
                color:
                  intent === i ? "#fff" : "#000",
              }}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        disabled={disabled || !target}
        onClick={() =>
          onCallPitch({
            pitchType,
            location: resolveLocation(target.row),
            intent,
          })
        }
        style={{
          padding: "6px 12px",
          fontWeight: "bold",
          width: "100%",
        }}
      >
        Throw Pitch
      </button>
    </div>
  );
}
