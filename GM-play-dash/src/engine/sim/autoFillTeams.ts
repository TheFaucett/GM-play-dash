// src/engine/sim/autoFillTeams.ts

import type { Player } from "../types/player";

/* ==============================================
   TYPES
============================================== */

export type TeamRosters = Record<string, string[]>;

export type AutoFillResult = {
  teams: TeamRosters;
  freeAgents: string[];
};

/* ==============================================
   CONFIG
============================================== */

const ROSTER_SIZE = 26;

// Soft constraints (v1 — tune later)
const MIN_PITCHERS = 11;
const MAX_PITCHERS = 14;

/* ==============================================
   HELPERS
============================================== */

function isPitcher(p: Player): boolean {
  return p.role === "SP" || p.role === "RP" || p.role === "CL";
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Very rough positional proxy.
 * Reserved for future use (C / SS / CF anchors).
 */
function isDefensiveAnchor(p: Player): boolean {
  const a = p.latents?.common.athleticism ?? 50;
  return a >= 65;
}

/* ==============================================
   MAIN ENTRY
============================================== */

export function autoFillTeams(args: {
  players: Record<string, Player>;
  teamIds: string[];
}): AutoFillResult {
  // 🔑 ONLY free agents are assignable
  const available = shuffle(
    Object.keys(args.players).filter(
      (id) => args.players[id].teamId === "FA"
    )
  );

  const teams: TeamRosters = {};
  const assigned = new Set<string>();

  for (const teamId of args.teamIds) {
    const roster: string[] = [];

    let pitchers = 0;
    let defenders = 0; // reserved for future constraints

    for (const playerId of available) {
      if (assigned.has(playerId)) continue;
      if (roster.length >= ROSTER_SIZE) break;

      const player = args.players[playerId];
      if (!player) continue;

      const pitcher = isPitcher(player);
      const defender = isDefensiveAnchor(player);

      // Soft role constraints
      if (pitcher && pitchers >= MAX_PITCHERS) continue;
      if (
        !pitcher &&
        roster.length - pitchers >= ROSTER_SIZE - MIN_PITCHERS
      )
        continue;

      roster.push(playerId);
      assigned.add(playerId);

      if (pitcher) pitchers++;
      if (defender) defenders++;
    }

    if (roster.length < ROSTER_SIZE) {
      console.warn(
        `⚠️ Team ${teamId} only filled ${roster.length}/${ROSTER_SIZE} players`
      );
    }

    teams[teamId] = roster;
  }

  // Everyone unassigned remains a free agent
  const freeAgents = available.filter((id) => !assigned.has(id));

  return { teams, freeAgents };
}
