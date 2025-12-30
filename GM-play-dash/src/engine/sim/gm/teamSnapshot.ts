// src/engine/sim/gm/teamSnapshot.ts

import type { Player } from "../../types/player";

export type TeamSnapshot = {
  rosterSize: number;
  pitchers: number;
  batters: number;

  injured: Player[];
  overworkedPitchers: Player[];
};

export function buildTeamSnapshot(players: Player[]): TeamSnapshot {
  const roster = players ?? [];

  const pitchers = roster.filter((p) => p.role === "SP" || p.role === "RP" || p.role === "CL");
  const batters = roster.filter((p) => p.role === "BAT");

  const injured = roster.filter((p) => (p.health ?? 100) <= 0);

  const overworkedPitchers = pitchers.filter((p) => (p.fatigue ?? 0) >= 75);

  return {
    rosterSize: roster.length,
    pitchers: pitchers.length,
    batters: batters.length,
    injured,
    overworkedPitchers,
  };
}
