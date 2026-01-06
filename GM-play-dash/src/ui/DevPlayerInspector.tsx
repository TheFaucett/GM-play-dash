// src/ui/DevPlayerInspector.tsx

import { useState } from "react";
import type { Player } from "../engine/types/player";

import { generatePlayer } from "../engine/sim/generatePlayer";
import {
  getBatterAttributes,
  getPitcherAttributes,
} from "../engine/sim/deriveAttributes";
import { describePlayer } from "../engine/sim/describePlayer";
import type { LeagueState } from "../engine/types/league"


type Props = {
  state: LeagueState;
};

export function DevPlayerInspector({ state }: Props) {
  const [player, setPlayer] = useState<Player | null>(null);

  function generate() {
    const p = generatePlayer({
      id: `dev_${Date.now()}`,

      age: Math.floor(18 + Math.random() * 18),
      teamId: "DEV",
      level: "MLB",
    });

    setPlayer(p);
  }

  if (!player) {
    return (
      <section style={{ padding: 16 }}>
        <h2>Dev Player Inspector</h2>
        <button onClick={generate}>Generate Player</button>
      </section>
    );
  }

  const identity = describePlayer(player);

  const batterAttrs = getBatterAttributes(player);
  const pitcherAttrs = getPitcherAttributes(player);

  return (
    <section
      style={{
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 720,
      }}
    >
      <h2>Dev Player Inspector</h2>

      <button onClick={generate} style={{ marginBottom: 12 }}>
        Regenerate Player
      </button>

      {/* =========================
          BASIC INFO
      ========================== */}
      <section>
        <h3>Basic Info</h3>
        <div>Name: {player.name}</div>
        <div>Age: {player.age}</div>
        <div>Handedness: {player.handedness}</div>
        <div>Role: {player.role}</div>
      </section>

      {/* =========================
          PLAYER IDENTITY (HUMAN)
      ========================== */}
      <section style={{ marginTop: 16 }}>
        <h3>Player Identity</h3>

        <div
          style={{
            background: "#111",
            color: "#0f0",
            padding: 12,
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "bold" }}>
            {identity.headline}
          </div>

          {identity.tags.length > 0 && (
            <ul style={{ marginTop: 8 }}>
              {identity.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* =========================
          DERIVED ATTRIBUTES
      ========================== */}
      <section style={{ marginTop: 16 }}>
        <h3>Derived Attributes</h3>

        <h4>Batting</h4>
        <pre>{JSON.stringify(batterAttrs, null, 2)}</pre>

        <h4>Pitching</h4>
        <pre>{JSON.stringify(pitcherAttrs, null, 2)}</pre>
      </section>

      {/* =========================
          RAW LATENTS (DEV ONLY)
      ========================== */}
      <section style={{ marginTop: 16 }}>
        <h3>Raw Latents (Dev Only)</h3>
        <pre>{JSON.stringify(player.latents, null, 2)}</pre>
      </section>

      {/* =========================
          RAW PLAYER OBJECT
      ========================== */}
      <details style={{ marginTop: 16 }}>
        <summary>Raw Player Object</summary>
        <pre>{JSON.stringify(player, null, 2)}</pre>
      </details>
    </section>
  );
}
