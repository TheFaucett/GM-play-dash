// src/engine/sim/gm/rotateBullpen.ts

import type { Player } from "../../types/player";

/**
 * Simple "bullpen rotation" idea:
 * - If too many pitchers are overworked, swap a reliever for a fresher one (call-up)
 * This is deliberately tiny; patchRoster() does most work.
 */
export function rotateBullpen(args: {
  teamId: string;
  roster: Player[];
  minors: Player[];
  roll?: () => number;
}): { updatedRoster: Player[]; callups: string[]; sentDown: string[] } {
  const roll = args.roll ?? Math.random;

  const roster = [...args.roster];
  const callups: string[] = [];
  const sentDown: string[] = [];

  const overworked = roster
    .filter((p) => p.role === "RP" || p.role === "CL")
    .filter((p) => (p.fatigue ?? 0) >= 80)
    .sort((a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0));

  if (overworked.length === 0) return { updatedRoster: roster, callups, sentDown };

  const candidate = args.minors
    .filter((p) => p.role === "RP" || p.role === "CL")
    .sort((a, b) => (a.fatigue ?? 0) - (b.fatigue ?? 0))[0];

  if (!candidate) return { updatedRoster: roster, callups, sentDown };

  const sendDown = overworked[0];

  // Swap (no IL system yet)
  const idx = roster.findIndex((p) => p.id === sendDown.id);
  if (idx >= 0) {
    roster[idx] = {
      ...candidate,
      teamId: args.teamId,
      level: "MLB",
      updatedAt: Date.now(),
    };

    callups.push(candidate.id);
    sentDown.push(sendDown.id);

    // Light fatigue relief on demoted guy (so he can “recover” in minors, if you track him)
    sendDown.fatigue = Math.max(0, (sendDown.fatigue ?? 0) - (15 + roll() * 10));
  }

  return { updatedRoster: roster, callups, sentDown };
}
