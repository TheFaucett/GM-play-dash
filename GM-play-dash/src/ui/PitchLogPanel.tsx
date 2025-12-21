import type { Pitch } from "../engine/types/pitch";
import { narrateAtBatStart } from "./narration/narrateAtBatStart";
import type { HalfInning } from "../engine/types/halfInning";
/* =========================================
   Small helpers
   ========================================= */

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* =========================================
   Labels
   ========================================= */

function pitchTypeLabel(type: Pitch["pitchType"]): string {
  switch (type) {
    case "FF": return "Four-seam fastball";
    case "SI": return "Sinker";
    case "CT": return "Cutter";
    case "SL": return "Slider";
    case "SW": return "Sweeper";
    case "CU": return "Curveball";
    case "KB": return "Knuckle curve";
    case "CH": return "Changeup";
    case "SF": return "Splitter";
    default:   return "Pitch";
  }
}

function locationLabel(loc: Pitch["location"]): string {
  switch (loc) {
    case "high": return "up";
    case "low": return "down";
    case "middle": return "over the plate";
    default: return "";
  }
}

/* =========================================
   Pitch narration (pitch + result)
   ========================================= */

function narratePitch(
  pitch: Pitch,
  prev?: Pitch
): string {
  const pitchName = pitchTypeLabel(pitch.pitchType);
  const loc = locationLabel(pitch.location);

  // --- optional inter-pitch connector
  const bridge = prev
    ? pick([
        "Next pitch — ",
        "He comes back with a ",
        "Follows it with a ",
        "Now the ",
        "",
      ])
    : "";

  switch (pitch.result) {
    case "ball":
      return (
        bridge +
        pick([
          `${pitchName} misses ${loc}. Ball.`,
          `${pitchName} just off the plate.`,
          `${pitchName} doesn't get the call.`,
        ])
      );

    case "strike":
      return (
        bridge +
        pick([
          `${pitchName} paints the ${loc} corner for a strike.`,
          `${pitchName} catches the zone.`,
          `${pitchName} sneaks in there.`,
        ])
      );

    case "foul":
      return (
        bridge +
        pick([
          `${pitchName} ${loc}, fouled away.`,
          `${pitchName} — just tipped foul.`,
          `${pitchName} spoiled at the plate.`,
        ])
      );

    case "in_play":
      return (
        bridge +
        pick([
          `${pitchName} put in play ${loc}.`,
          `${pitchName} — contact made.`,
          `${pitchName} hit into play.`,
        ])
      );

    default:
      return `${pitchName} ${loc}.`;
  }
}

/* =========================================
   Pitch Log Panel
   ========================================= */

type Props = {
  pitches: Pitch[];
  halfInning: HalfInning;
};

export function PitchLogPanel({ pitches, halfInning }: Props) {
  if (!pitches.length) return null;

  return (
    <section
      style={{
        marginTop: 20,
        padding: 12,
        border: "1px solid #ccc",
        background: "#fafafa",
      }}
    >
      <h3>At-Bat</h3>

      {/* At-bat start narration */}
      <div
        style={{
          marginBottom: 8,
          fontStyle: "italic",
          color: "#555",
        }}
      >
        {narrateAtBatStart(
          halfInning.runnerState,
          halfInning.outs
        )}
      </div>

      <ol
        style={{
          paddingLeft: 20,
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {pitches.map((pitch, i) => (
          <li key={pitch.id} style={{ marginBottom: 6 }}>
            <span style={{ opacity: 0.6, marginRight: 6 }}>
              #{i + 1}
            </span>
            {pitch.pitchType} {pitch.location} ({pitch.intent}) →{" "}
            <strong>{pitch.result}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}