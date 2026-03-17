import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { Action } from "../engine/actions/types";

type Props = {
  state: LeagueState;
  dispatch: React.Dispatch<Action>;
};

export function ReleasePlayerButton({ state, dispatch }: Props) {
  const userTeamId = state.meta.userTeamId;
  const selectedPlayerId = state.pointers.selectedPlayerId;

  const selectedPlayer =
    selectedPlayerId != null ? state.players[selectedPlayerId] : undefined;

  const canRelease =
    state.meta.phase === "OFFSEASON" &&
    userTeamId != null &&
    selectedPlayerId != null &&
    selectedPlayer != null &&
    selectedPlayer.teamId === userTeamId;

  const onRelease = () => {
    if (!selectedPlayerId) return;
    dispatch({
      type: "RELEASE_PLAYER",
      payload: { playerId: selectedPlayerId },
    });
  };

  return (
    <button
      onClick={onRelease}
      disabled={!canRelease}
      title={
        canRelease
          ? "Release selected player to Free Agency"
          : "Select a player on your team (OFFSEASON only)"
      }
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #ccc",
        cursor: canRelease ? "pointer" : "not-allowed",
        opacity: canRelease ? 1 : 0.5,
      }}
    >
      Release Player
    </button>
  );
}