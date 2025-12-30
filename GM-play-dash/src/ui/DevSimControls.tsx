// src/ui/DevSimControls.tsx

import React from "react";
import { useLeagueState, useLeagueDispatch } from "../context/leagueContext";

import { handleSimHalfInning } from "../engine/reducer/handlers/simHalfInning";
import { handleSimGame } from "../engine/reducer/handlers/handleSimGame";
import { handleSimSeason } from "../engine/reducer/handlers/handleSimSeason";

export function DevSimControls() {
  const state = useLeagueState();
  const dispatch = useLeagueDispatch();

  function apply(fn: (s: any) => any) {
    dispatch({ type: "DEV_REPLACE_STATE", payload: fn(state) });
  }

  return (
    <div style={{ padding: 12, border: "1px solid #444" }}>
      <h3>🛠 Dev Simulation Controls</h3>

      {/* ---------------- Player ---------------- */}
      <section>
        <h4>Players</h4>
        <button onClick={() => dispatch({ type: "DEV_GENERATE_PLAYER" })}>
          Generate Player
        </button>
      </section>

      {/* ---------------- Game ---------------- */}
      <section>
        <h4>Game</h4>

        <button onClick={() => apply(handleSimHalfInning)}>
          Sim Half Inning
        </button>

        <button onClick={() => apply(handleSimGame)}>
          Sim Full Game
        </button>
      </section>

      {/* ---------------- Season ---------------- */}
      <section>
        <h4>Season</h4>

        <button onClick={() => apply(handleSimSeason)}>
          Sim Full Season
        </button>
      </section>
    </div>
  );
}
