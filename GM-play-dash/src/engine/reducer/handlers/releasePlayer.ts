import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";

/**
 * Releases a player from the user's team to Free Agency ("FA").
 *
 * HARD GUARANTEES:
 * - Reducer-safe (no in-place mutation)
 * - Only the user can release players from their own team
 * - Only allowed in OFFSEASON (for now)
 * - Player.teamId becomes "FA"
 * - Transaction is logged
 *
 * DOES NOT (yet):
 * - Enforce roster minimums
 * - Handle dead money / contract buyouts
 * - Remove player from lineup/rotation/bullpen arrays (optional follow-up)
 */
export function handleReleasePlayer(
  state: LeagueState,
  args: { playerId: EntityId }
): LeagueState {
  const { playerId } = args;

  // Phase guard (tight for first iteration)
  if (state.meta.phase !== "OFFSEASON") {
    console.warn("⛔ releasePlayer blocked: invalid phase", state.meta.phase);
    return state;
  }

  const userTeamId = state.meta.userTeamId;
  if (!userTeamId) {
    console.warn("⛔ releasePlayer blocked: no userTeamId set");
    return state;
  }

  const player = state.players[playerId];
  if (!player) {
    console.warn("❌ releasePlayer: player not found", playerId);
    return state;
  }

  if (player.teamId !== userTeamId) {
    console.warn("⛔ releasePlayer blocked: player not on user team", {
      playerId,
      playerTeamId: player.teamId,
      userTeamId,
    });
    return state;
  }

  // Optional: prevent releasing if player is currently active in an in-progress game (future)
  // if (state.pointers.gameId && state.games[state.pointers.gameId]?.status === "in_progress") ...

  const now = Date.now();

  const nextPlayer = {
    ...player,
    teamId: "FA" as EntityId,
    updatedAt: now,
    // For now: keep contract attached (simplest, also avoids silent money deletion).
    // If you prefer: set contract: undefined to "wipe" the obligation.
    contract: player.contract ? { ...player.contract } : undefined,
    history: {
      ...player.history,
      transactions: [
        ...player.history.transactions,
        `RELEASED:${userTeamId}->FA`,
      ],
    },
  };

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: nextPlayer,
    },
    log: [
      ...state.log,
      {
        id: `log_player_released_${playerId}_${now}`,
        timestamp: now,
        type: "PLAYER_RELEASED",
        refs: [playerId, userTeamId],
        description: `User released ${playerId} to Free Agency`,
      },
    ],
  };
}