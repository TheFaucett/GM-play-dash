import type { Player } from "../types/player";
import type {
  BatterArchetype,
  PitcherArchetype,
} from "../types/playerArchetypes";

export function generateStubRoster(teamId: string): Player[] {
  const now = Date.now();

  const batters: Player[] = Array.from({ length: 9 }, (_, i) => ({
    id: `${teamId}_bat_${i}`,
    createdAt: now,
    updatedAt: now,
    name: `${teamId.toUpperCase()} Batter ${i + 1}`,
    age: 26,
    handedness: "R",
    teamId,
    level: "MLB",
    role: "BAT",
    ratings: {
      batterArchetype: "balanced" satisfies BatterArchetype,
      contact: 50,
      power: 50,
      discipline: 50,
      vision: 50,
      speed: 50,
      fielding: 50,
      arm: 50,
    },
    fatigue: 0,
    health: 100,
    history: { injuries: [], transactions: [] },
  }));

  const pitcher: Player = {
    id: `${teamId}_sp`,
    createdAt: now,
    updatedAt: now,
    name: `${teamId.toUpperCase()} Starter`,
    age: 28,
    handedness: "R",
    teamId,
    level: "MLB",
    role: "SP",
    ratings: {
      pitcherArchetype: "power_ace" satisfies PitcherArchetype,
      stuff: 60,
      command: 55,
      movement: 50,
      stamina: 70,
      fielding: 45,
      arm: 55,
      speed: 35,
    },
    fatigue: 0,
    health: 100,
    history: { injuries: [], transactions: [] },
  };

  return [...batters, pitcher];
}
