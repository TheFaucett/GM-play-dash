// src/ui/DevSimControls.tsx

import React from "react";
import type { LeagueState } from "../engine/types/league";

import { handleSimHalfInning } from "../engine/reducer/handlers/simHalfInning";
import { handleSimGame } from "../engine/reducer/handlers/simGame";
import { handleSimSeason } from "../engine/reducer/handlers/simSeason";

type Props = {
  state: LeagueState;
  setState: React.Dispatch<React.SetStateAction<LeagueState>>;
};

export function DevSimControls({ state, setState }: Props) {
  function apply(fn: (s: LeagueState) => LeagueState) {
    setState(fn(state));
  }

  return (
    <div style={{ padding: 12, border: "1px solid #444", marginBottom: 12 }}>
      <h3>🛠 Dev Simulation Controls</h3>

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
      <section style={{ marginTop: 8 }}>
        <h4>Season</h4>

        <button onClick={() => apply(handleSimSeason)}>
          Sim Full Season
        </button>
      </section>
    </div>
  );
}
