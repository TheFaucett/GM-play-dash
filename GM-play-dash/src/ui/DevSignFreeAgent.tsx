import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

type Props = {
  state: LeagueState;
  setState: React.Dispatch<React.SetStateAction<LeagueState | null>>;
};

export function DevSignFreeAgent({ state, setState }: Props) {
  function signOne() {
    const pool = state.playerPool;

    if (!pool || pool.freeAgents.length === 0) {
      console.warn("❌ No free agents available");
      return;
    }

    const teamList = Object.values(state.teams);
    if (teamList.length === 0) {
      console.warn("❌ No teams available");
      return;
    }

    const playerId = pool.freeAgents[0] as EntityId;
    const player = state.players[playerId];
    if (!player) {
      console.error("❌ Player not found", playerId);
      return;
    }

    const team =
      teamList[Math.floor(Math.random() * teamList.length)];

    console.log("✍️ Signing Free Agent", {
      player: player.name,
      team: team.name,
      role: player.role,
    });

    setState((prev) => {
      if (!prev || !prev.playerPool) return prev;

      const updatedPlayer = {
        ...player,
        teamId: team.id,
      };

      return {
        ...prev,

        players: {
          ...prev.players,
          [playerId]: updatedPlayer,
        },

        teams: {
          ...prev.teams,
          [team.id]: {
            ...team,
            lineup:
              player.role === "BAT"
                ? [...team.lineup, playerId]
                : team.lineup,
            rotation:
              player.role === "SP"
                ? [...team.rotation, playerId]
                : team.rotation,
          },
        },

        playerPool: {
          ...prev.playerPool,
          freeAgents: prev.playerPool.freeAgents.slice(1),
        },
      };
    });
  }

  return (
    <section style={{ marginTop: 12 }}>
      <button onClick={signOne}>
        ✍️ Sign Random Free Agent
      </button>
    </section>
  );
}
