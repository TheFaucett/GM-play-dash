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
 * - Player is removed from team depth charts (lineup/rotation/bullpen)
 * - Transaction is logged
 *
 * DOES NOT (yet):
 * - Enforce roster minimums
 * - Handle dead money / contract buyouts
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

  const team = state.teams[userTeamId];
  if (!team) {
    console.warn("❌ releasePlayer: user team not found", userTeamId);
    return state;
  }

  const now = Date.now();

  // -----------------------------
  // 1) Update player -> FA
  // -----------------------------
  const nextPlayer = {
    ...player,
    teamId: "FA" as EntityId,
    updatedAt: now,
    // Keep contract attached for now (simple, avoids silent money deletion)
    contract: player.contract ? { ...player.contract } : undefined,
    history: {
      ...player.history,
      transactions: [
        ...player.history.transactions,
        `RELEASED:${userTeamId}->FA`,
      ],
    },
  };

  // -----------------------------
  // 2) Scrub depth charts
  // -----------------------------
  const scrub = (arr: EntityId[] | undefined) =>
    (arr ?? []).filter((id) => id !== playerId);

  const nextTeam = {
    ...team,
    lineup: scrub(team.lineup),
    rotation: scrub(team.rotation),
    bullpen: scrub(team.bullpen),
  };

  // -----------------------------
  // 3) Commit + log
  // -----------------------------
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: nextPlayer,
    },
    teams: {
      ...state.teams,
      [userTeamId]: nextTeam,
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