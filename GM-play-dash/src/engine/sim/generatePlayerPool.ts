// engine/sim/generatePlayerPool.ts

import type { Player } from "../types/player";
import { generatePlayer } from "./generatePlayer";

/* ==============================================
   TYPES
============================================== */

export type PlayerPool = {
  players: Record<string, Player>;
  freeAgents: string[];
};

/* ==============================================
   HELPERS
============================================== */

function pickAge(): number {
  const r = Math.random();

  if (r < 0.15) return randInt(18, 21); // prospects
  if (r < 0.40) return randInt(22, 25);
  if (r < 0.65) return randInt(26, 29);
  if (r < 0.85) return randInt(30, 33);
  return randInt(34, 38); // vets
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function makeName(i: number): string {
  // Placeholder — easy to replace later
  return `Player ${i + 1}`;
}

/* ==============================================
   MAIN ENTRY
============================================== */

export function generatePlayerPool(
  count = 1300,
  seed?: number
): PlayerPool {
  const players: Record<string, Player> = {};
  const freeAgents: string[] = [];

  for (let i = 0; i < count; i++) {
    const id = `player_${i}`;
    const age = pickAge();

    const player = generatePlayer({
      id,
      name: makeName(i),
      age,
      teamId: "FA",       // 🔑 nobody on teams yet
      level: "MLB",       // everyone eligible
      seed: seed ? seed + i : undefined,
    });

    players[id] = player;
    freeAgents.push(id);
  }

  return { players, freeAgents };
}
