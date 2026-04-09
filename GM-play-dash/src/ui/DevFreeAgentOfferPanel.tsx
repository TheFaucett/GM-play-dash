import React, { useMemo, useState } from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Action } from "../engine/actions/types";
import type { Player } from "../engine/types/player";

export function DevFreeAgentOfferPanel({
  state,
  dispatch,
}: {
  state: LeagueState;
  dispatch: (a: Action) => void;
}) {
  const selectedPlayerId = (state.pointers as any).selectedPlayerId as EntityId | undefined;
  const p = selectedPlayerId ? (state.players[selectedPlayerId] as Player | undefined) : undefined;

  const [years, setYears] = useState(3);
  const [aavM, setAavM] = useState(8); // millions
  const [target, setTarget] = useState<"AAA" | "MLB">("AAA");

  const userTeamId = state.meta.userTeamId as EntityId | null;

  const canOffer =
    state.meta.phase === "OFFSEASON" &&
    !!userTeamId &&
    !!p &&
    p.teamId === ("FA" as EntityId);

  if (!p || p.teamId !== ("FA" as EntityId)) {
    return (
      <div style={{ opacity: 0.75, fontSize: 12 }}>
        Select a free agent to make an offer.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ fontWeight: 900 }}>Offer:</div>

      <label style={{ fontSize: 12, opacity: 0.85 }}>
        Years{" "}
        <input
          type="number"
          value={years}
          min={1}
          max={10}
          onChange={(e) => setYears(parseInt(e.target.value || "1", 10))}
          style={{ width: 60 }}
        />
      </label>

      <label style={{ fontSize: 12, opacity: 0.85 }}>
        AAV ($M){" "}
        <input
          type="number"
          value={aavM}
          min={0}
          max={60}
          onChange={(e) => setAavM(parseInt(e.target.value || "0", 10))}
          style={{ width: 70 }}
        />
      </label>

      <label style={{ fontSize: 12, opacity: 0.85 }}>
        Level{" "}
        <select value={target} onChange={(e) => setTarget(e.target.value as any)}>
          <option value="AAA">AAA</option>
          <option value="MLB">MLB</option>
        </select>
      </label>

      <button
        disabled={!canOffer}
        onClick={() => {
          if (!userTeamId) return;
          dispatch({
            type: "MAKE_FA_OFFER",
            payload: {
              playerId: p.id,
              toTeamId: userTeamId,
              years,
              aav: aavM * 1_000_000,
              targetLevel: target,
              addTo40: target === "MLB",
            },
          } as Action);
        }}
        style={{
          background: canOffer ? "#081b10" : "#111",
          color: canOffer ? "#00ff88" : "#666",
          border: "1px solid #0a3b20",
          padding: "6px 10px",
          borderRadius: 10,
          cursor: canOffer ? "pointer" : "not-allowed",
          fontWeight: 900,
        }}
      >
        Submit Offer
      </button>
    </div>
  );
}