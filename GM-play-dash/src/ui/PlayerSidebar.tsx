import type { LeagueState } from "../engine/types/league";
import type { EntityId } from "../engine/types/base";

type Props = {
  state: LeagueState;
  dispatch: (action: any) => void;
};

export function PlayerSidebar({ state, dispatch }: Props) {
  const userTeamId = state.meta.userTeamId;
  if (!userTeamId) return null;

  const players = Object.values(state.players)
    .filter(p => p.teamId === userTeamId)
    .sort((a, b) => (b as any).ovr - (a as any).ovr);

  const selected = state.pointers.selectedPlayerId ?? null;

  return (
    <div
      style={{
        width: 280,
        borderRight: "1px solid #333",
        padding: 12,
        overflowY: "auto",
      }}
    >
      <h3>Roster</h3>

      {players.map(p => (
        <div
          key={p.id}
          onClick={() =>
            dispatch({
              type: "SELECT_PLAYER",
              payload: { playerId: p.id },
            })
          }
          style={{
            padding: 6,
            marginBottom: 4,
            cursor: "pointer",
            background:
              selected === p.id ? "#1e2a38" : "transparent",
            border:
              selected === p.id
                ? "1px solid #4da3ff"
                : "1px solid transparent",
          }}
        >
          <strong>{p.id}</strong>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {p.role} | Age {p.age} | OVR {(p as any).ovr}
          </div>
        </div>
      ))}
    </div>
  );
}
