// engine/sim/validateRoster.ts

import type { Player } from "../types/player";
import { assignFieldingPositions } from "./assignFieldingPositions";

/* ==============================================
   TYPES
============================================== */

export type RosterReport = {
  valid: boolean;
  errors: string[];
  counts: {
    total: number;
    pitchers: number;
    batters: number;
  };
};

/* ==============================================
   CONSTANTS
============================================== */

const ROSTER_LIMIT = 26;
const MIN_PITCHERS = 11;
const MAX_PITCHERS = 14;

const REQUIRED_POSITIONS = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
] as const;

/* ==============================================
   MAIN ENTRY
============================================== */

export function validateRoster(players: Player[]): RosterReport {
  const errors: string[] = [];

  const pitchers = players.filter(
    (p) => p.role === "SP" || p.role === "RP" || p.role === "CL"
  );

  const batters = players.filter((p) => p.role === "BAT");

  /* ------------------------------
     SIZE
  ------------------------------ */
  if (players.length !== ROSTER_LIMIT) {
    errors.push(
      `Roster has ${players.length} players (must be ${ROSTER_LIMIT})`
    );
  }

  /* ------------------------------
     PITCHER COUNT
  ------------------------------ */
  if (pitchers.length < MIN_PITCHERS) {
    errors.push(
      `Too few pitchers (${pitchers.length}, minimum ${MIN_PITCHERS})`
    );
  }

  if (pitchers.length > MAX_PITCHERS) {
    errors.push(
      `Too many pitchers (${pitchers.length}, maximum ${MAX_PITCHERS})`
    );
  }

  /* ------------------------------
     ROLE SANITY
  ------------------------------ */
  for (const p of players) {
    if (!p.role) {
      errors.push(`Player ${p.name ?? p.id} has no role`);
    }
  }

  /* ------------------------------
     DEFENSIVE COVERAGE
     (capability-based, not labels)
  ------------------------------ */

  const coveredPositions = new Set<string>();
  let hasPrimaryCatcher = false;

  for (const p of players) {
    if (!p.latents) continue;

    const fielding = assignFieldingPositions(p.latents);
    if (!fielding) continue;

    if (fielding.primary) {
      coveredPositions.add(fielding.primary);

      if (fielding.primary === "C") {
        hasPrimaryCatcher = true;
      }
    }

    for (const pos of fielding.secondary ?? []) {
      coveredPositions.add(pos);
    }
  }

  /* ---- Missing positions ---- */
  for (const pos of REQUIRED_POSITIONS) {
    if (!coveredPositions.has(pos)) {
      errors.push(`No capable ${pos} on roster`);
    }
  }

  /* ---- Catcher hard rule ---- */
  if (!hasPrimaryCatcher) {
    errors.push("Roster must include at least one primary catcher");
  }

  /* ------------------------------
     FINAL REPORT
  ------------------------------ */
  return {
    valid: errors.length === 0,
    errors,
    counts: {
      total: players.length,
      pitchers: pitchers.length,
      batters: batters.length,
    },
  };
}
