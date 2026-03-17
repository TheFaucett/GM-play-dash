// src/engine/reducer/handlers/advanceOffseasonDay.ts

import type { LeagueState } from "../../types/league";
import { aiSignFreeAgents } from "../../sim/aiSignFreeAgent";
import { revalueAllPlayers } from "../../sim/revalueAllPlayers";

/**
 * Advances the offseason by ONE day.
 *
 * HARD GUARANTEES:
 * - Only valid in OFFSEASON phase
 * - Player values may change
 * - AI may sign free agents
 * - Offseason day increments exactly once
 * - Never mutates state in-place
 */
export function handleAdvanceOffseasonDay(state: LeagueState): LeagueState {
  /* --------------------------------------------
     PHASE GUARD
  -------------------------------------------- */
  if (state.meta.phase !== "OFFSEASON") {
    console.warn("⛔ advanceOffseasonDay blocked: invalid phase", state.meta.phase);
    return state;
  }

  const seasonId = state.pointers.seasonId;
  if (!seasonId) {
    console.warn("❌ advanceOffseasonDay: no seasonId in pointers");
    return state;
  }

  const season = state.seasons[seasonId];
  if (!season) {
    console.warn("❌ advanceOffseasonDay: season not found", seasonId);
    return state;
  }

  const now = Date.now();

  let next: LeagueState = state;

  /* --------------------------------------------
     1️⃣ PLAYER REVALUATION (AUTHORITATIVE)
  -------------------------------------------- */
  next = revalueAllPlayers(next);

  /* --------------------------------------------
     2️⃣ AI FREE AGENT SIGNING
  -------------------------------------------- */
  next = aiSignFreeAgents(next);

  /* --------------------------------------------
     3️⃣ ADVANCE OFFSEASON DAY
  -------------------------------------------- */
  const nextDay = (next.seasons[seasonId]?.offseasonDay ?? season.offseasonDay ?? 0) + 1;

  next = {
    ...next,

    seasons: {
      ...next.seasons,
      [seasonId]: {
        ...next.seasons[seasonId],
        offseasonDay: nextDay,
        updatedAt: now,
      },
    },

    log: [
      ...next.log,
      {
        id: `log_offseason_day_${seasonId}_${nextDay}`,
        timestamp: now,
        type: "OFFSEASON_DAY",
        refs: [seasonId],
        description: `Offseason day ${nextDay}`,
      },
    ],
  };

  console.log("📅 Offseason day advanced", {
    seasonId,
    offseasonDay: nextDay,
  });

  return next;
}