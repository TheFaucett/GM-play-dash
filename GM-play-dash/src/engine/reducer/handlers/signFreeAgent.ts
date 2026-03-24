import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";

export function handleSignFreeAgent(
  state: LeagueState,
  args: { playerId: EntityId; toTeamId: EntityId }
): LeagueState {
  const { playerId, toTeamId } = args;

  if (state.meta.phase !== "OFFSEASON") return state;

  const player = state.players[playerId];
  if (!player) return state;

  if (player.teamId !== "FA") return state;

  const team = state.teams[toTeamId];
  if (!team) return state;

  const now = Date.now();

  // Update player
  const nextPlayer = {
    ...player,
    teamId: toTeamId,
    updatedAt: now,
    history: {
      ...player.history,
      transactions: [...player.history.transactions, `SIGNED_FA:${toTeamId}`],
    },
  };

  // Update team arrays (minimal, match your cheat)
  const nextTeam = {
    ...team,
    lineup: player.role === "BAT" ? [...team.lineup, playerId] : team.lineup,
    rotation: player.role === "SP" ? [...team.rotation, playerId] : team.rotation,
    bullpen:
      player.role === "RP" || player.role === "CL"
        ? [...team.bullpen, playerId]
        : team.bullpen,
  };

  // Remove from pool if present
  const nextPool = state.playerPool
    ? {
        ...state.playerPool,
        freeAgents: state.playerPool.freeAgents.filter((id) => id !== playerId),
      }
    : undefined;

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: nextPlayer,
    },
    teams: {
      ...state.teams,
      [toTeamId]: nextTeam,
    },
    ...(nextPool ? { playerPool: nextPool } : {}),
    log: [
      ...state.log,
      {
        id: `log_fa_signed_${playerId}_${toTeamId}_${now}`,
        timestamp: now,
        type: "FA_SIGNED",
        refs: [playerId, toTeamId],
        description: `Signed FA ${playerId} to ${toTeamId}`,
      },
    ],
  };
}