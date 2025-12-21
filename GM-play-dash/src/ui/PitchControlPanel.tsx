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
  "FF", // four-seam
  "SI", // sinker
  "CT", // cutter
  "SL", // slider
  "SW", // sweeper
  "CU", // curve
  "KB", // knuckle curve
  "CH", // changeup
  "SF", // splitter
];

const LOCATIONS: PitchLocation[] = ["high", "middle", "low"];

const INTENTS: PitchIntent[] = ["attack", "paint", "waste"];

export function PitchControlPanel({
  disabled,
  onCallPitch,
}: Props) {
  const [pitchType, setPitchType] =
    useState<PitchType>("FF");
  const [location, setLocation] =
    useState<PitchLocation>("middle");
  const [intent, setIntent] =
    useState<PitchIntent>("attack");

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: 12,
        borderRadius: 6,
      }}
    >
      <h3>Call Pitch</h3>

      {/* Pitch Type */}
      <div style={{ marginBottom: 8 }}>
        <strong>Pitch</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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

      {/* Location */}
      <div style={{ marginBottom: 8 }}>
        <strong>Location</strong>
        <div style={{ display: "flex", gap: 6 }}>
          {LOCATIONS.map((l) => (
            <button
              key={l}
              disabled={disabled}
              onClick={() => setLocation(l)}
              style={{
                padding: "4px 8px",
                background:
                  location === l ? "#333" : "#eee",
                color:
                  location === l ? "#fff" : "#000",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Intent */}
      <div style={{ marginBottom: 12 }}>
        <strong>Intent</strong>
        <div style={{ display: "flex", gap: 6 }}>
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

      <button
        disabled={disabled}
        onClick={() =>
          onCallPitch({
            pitchType,
            location,
            intent,
          })
        }
        style={{
          padding: "6px 12px",
          fontWeight: "bold",
        }}
      >
        Throw Pitch
      </button>
    </div>
  );
}
