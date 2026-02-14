import React, { useMemo, useState } from "react";

import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";
import type { Player } from "../engine/types/player";

type Props = {
  state: LeagueState;
  dispatch: (action: any) => void;
};

function getTeamPlayers(state: LeagueState, teamId: EntityId): Player[] {
  return Object.values(state.players).filter(
    (p) => p.teamId === teamId
  );
}

function playerLabel(p: Player): string {
  const role = p.role;
  const age = p.age ?? "?";
  const ovr =
    (p as any).ovr ?? (p as any).ratings?.ovr ?? "?";
  return `${p.id} — ${role} — age ${age} — ovr ${ovr}`;
}

export function DevTradeOfferBuilder({
  state,
  dispatch,
}: Props) {
  const userTeamId =
    state.meta.userTeamId as EntityId | null;

  const [targetTeamId, setTargetTeamId] =
    useState<EntityId | "">("");

  const [offerIds, setOfferIds] = useState<EntityId[]>([]);
  const [requestIds, setRequestIds] = useState<
    EntityId[]
  >([]);

  /* --------------------------------------------
     DERIVED
  -------------------------------------------- */

  const teamOptions = useMemo(() => {
    return Object.values(state.teams)
      .map((t) => ({
        id: t.id as EntityId,
        name: t.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.teams]);

  const userPlayers = useMemo(() => {
    if (!userTeamId) return [];
    return getTeamPlayers(state, userTeamId);
  }, [state, userTeamId]);

  const targetPlayers = useMemo(() => {
    if (!targetTeamId) return [];
    return getTeamPlayers(
      state,
      targetTeamId as EntityId
    );
  }, [state, targetTeamId]);

  /* --------------------------------------------
     🔥 DERIVE VERDICT FROM LOG (CLEAN VERSION)
  -------------------------------------------- */

  const lastTradeEvent = useMemo(() => {
    if (!userTeamId || !targetTeamId) return null;

    // Walk backwards to find most recent trade event
    for (let i = state.log.length - 1; i >= 0; i--) {
      const event = state.log[i];

      if (
        event.type === "TRADE_OFFER_SENT" ||
        event.type === "TRADE_OFFER_REJECTED"
      ) {
        return event;
      }
    }

    return null;
  }, [state.log, userTeamId, targetTeamId]);

  const verdict =
    lastTradeEvent?.type === "TRADE_OFFER_REJECTED"
      ? "REJECTED"
      : lastTradeEvent?.type === "TRADE_OFFER_SENT"
      ? "ACCEPTED"
      : null;

  /* --------------------------------------------
     ACTIONS
  -------------------------------------------- */

  function resetSelections() {
    setOfferIds([]);
    setRequestIds([]);
  }

  function offerTrade() {
    if (!userTeamId || !targetTeamId) return;
    if (
      offerIds.length === 0 ||
      requestIds.length === 0
    )
      return;

    dispatch({
      type: "OFFER_TRADE_PROPOSAL",
      payload: {
        fromTeamId: userTeamId,
        toTeamId: targetTeamId,
        fromTeamPlayers: offerIds,
        toTeamPlayers: requestIds,
      },
    });

    resetSelections();
  }

  /* --------------------------------------------
     RENDER
  -------------------------------------------- */

  if (!userTeamId) {
    return (
      <div
        style={{
          padding: 12,
          border: "1px solid #333",
          marginTop: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          📦 Dev Trade Offer Builder
        </h3>
        <p>Pick a user team first.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #333",
        marginTop: 12,
      }}
    >
      <h3 style={{ marginTop: 0 }}>
        📦 Dev Trade Offer Builder
      </h3>

      {/* 🔥 VERDICT BANNER */}
      {verdict && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            fontWeight: "bold",
            textAlign: "center",
            border: "1px solid #444",
            background:
              verdict === "ACCEPTED"
                ? "#112b11"
                : "#2b1111",
            color:
              verdict === "ACCEPTED"
                ? "#00ff88"
                : "#ff4444",
          }}
        >
          {verdict === "ACCEPTED"
            ? "🟢 Trade Offer Sent — AI Interested"
            : "🔴 Trade Rejected by AI"}
        </div>
      )}

      {/* TARGET TEAM */}
      <div style={{ marginBottom: 10 }}>
        <label
          style={{
            display: "block",
            marginBottom: 6,
          }}
        >
          Target team
        </label>

        <select
          value={targetTeamId}
          onChange={(e) => {
            setTargetTeamId(
              e.target.value as EntityId
            );
            resetSelections();
          }}
          style={{ width: "100%", padding: 6 }}
        >
          <option value="">
            -- Select team --
          </option>

          {teamOptions
            .filter((t) => t.id !== userTeamId)
            .map((t) => (
              <option
                key={t.id}
                value={t.id}
              >
                {t.name} ({t.id})
              </option>
            ))}
        </select>
      </div>

      {/* SELECTION GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* OFFER */}
        <div
          style={{
            border: "1px solid #222",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0 }}>
            🟩 You Offer
          </h4>

          <select
            multiple
            value={offerIds}
            onChange={(e) => {
              const selected = Array.from(
                e.target.selectedOptions
              ).map(
                (o) =>
                  o.value as EntityId
              );
              setOfferIds(
                selected.slice(0, 3)
              );
            }}
            style={{
              width: "100%",
              height: 240,
            }}
          >
            {userPlayers.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {playerLabel(p)}
              </option>
            ))}
          </select>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
            }}
          >
            Selected: {offerIds.length}
          </div>
        </div>

        {/* REQUEST */}
        <div
          style={{
            border: "1px solid #222",
            padding: 10,
          }}
        >
          <h4 style={{ marginTop: 0 }}>
            🟥 You Request
          </h4>

          {!targetTeamId ? (
            <p
              style={{
                fontSize: 12,
                opacity: 0.7,
              }}
            >
              Select a target team first.
            </p>
          ) : (
            <>
              <select
                multiple
                value={requestIds}
                onChange={(e) => {
                  const selected =
                    Array.from(
                      e.target
                        .selectedOptions
                    ).map(
                      (o) =>
                        o.value as EntityId
                    );
                  setRequestIds(
                    selected.slice(0, 3)
                  );
                }}
                style={{
                  width: "100%",
                  height: 240,
                }}
              >
                {targetPlayers.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {playerLabel(p)}
                  </option>
                ))}
              </select>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                }}
              >
                Selected: {requestIds.length}
              </div>
            </>
          )}
        </div>
      </div>

      {/* BUTTONS */}
      <div
        style={{
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={offerTrade}
          disabled={
            !targetTeamId ||
            offerIds.length === 0 ||
            requestIds.length === 0
          }
          style={{
            padding: "8px 12px",
            background: "#222",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          📤 Offer Trade
        </button>

        <button
          onClick={resetSelections}
          style={{
            padding: "8px 12px",
            background: "#111",
            color: "#ccc",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
