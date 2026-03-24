import type { Player, PlayerRosterStatus } from "../types/player";

/**
 * Returns a roster status with sane defaults
 * for players that don't have `player.roster` yet.
 */
export function getRosterStatus(player: Player): PlayerRosterStatus {
  const existing = player.roster;
  if (existing) return existing;

  // Simple bootstrap policy:
  // - MLB players are on the 40 by default
  // - AAA players are not on the 40 by default
  // - give young players options, older players fewer (very rough)
  const on40 = player.level === "MLB";

  const optionYearsRemaining =
    player.age <= 25 ? 3 : player.age <= 28 ? 2 : 0;

  return {
    on40,
    optionYearsRemaining,
    optionUsedThisYear: false,
  };
}