// src/ui/UserLineupEditor.tsx

import React from "react";
import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

type Props = {
  state: LeagueState;
  setState: React.Dispatch<React.SetStateAction<LeagueState | null>>;
};

export function UserLineupEditor({ state, setState }: Props) {
  const userTeamId = state.meta.userTeamId;
  if (!userTeamId) return null;

  const team = state.teams[userTeamId];
  if (!team) return null;

  const players = state.players;

  /* --------------------------------------------
     HELPERS
  -------------------------------------------- */

  function move(
    arr: EntityId[],
    from: number,
    to: number
  ): EntityId[] {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  function updateTeam(nextTeam: Partial<typeof team>) {
    setState((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        teams: {
          ...prev.teams,
          [team.id]: {
            ...prev.teams[team.id],
            ...nextTeam,
          },
        },
      };
    });
  }

  /* --------------------------------------------
     RENDER HELPERS
  -------------------------------------------- */

  function renderPlayerRow(
    playerId: EntityId,
    index: number,
    list: EntityId[],
    onMove: (from: number, to: number) => void
  ) {
    const p = players[playerId];

    return (
      <div
        key={playerId}
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 4,
          gap: 8,
        }}
      >
        <strong>{index + 1}.</strong>
        <span style={{ width: 160 }}>
          {p.name} ({p.role}, {p.handedness})
        </span>

        <button
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          ↑
        </button>

        <button
          disabled={index === list.length - 1}
          onClick={() => onMove(index, index + 1)}
        >
          ↓
        </button>
      </div>
    );
  }

  /* --------------------------------------------
     UI
  -------------------------------------------- */

  return (
    <div style={{ marginTop: 16 }}>
      <h3>📝 Lineup Editor — {team.name}</h3>

      {/* LINEUP */}
      <section style={{ marginBottom: 16 }}>
        <h4>Batting Lineup</h4>

        {team.lineup.map((pid, i) =>
          renderPlayerRow(pid, i, team.lineup, (from, to) =>
            updateTeam({
              lineup: move(team.lineup, from, to),
            })
          )
        )}
      </section>

      {/* ROTATION */}
      <section>
        <h4>Starting Rotation</h4>

        {team.rotation.map((pid, i) =>
          renderPlayerRow(pid, i, team.rotation, (from, to) =>
            updateTeam({
              rotation: move(team.rotation, from, to),
              activePitcherId:
                from === 0 || to === 0
                  ? team.rotation[to]
                  : team.activePitcherId,
            })
          )
        )}
      </section>
    </div>
  );
}
