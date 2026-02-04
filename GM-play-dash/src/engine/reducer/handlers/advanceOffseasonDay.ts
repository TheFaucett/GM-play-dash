// src/engine/reducer/handlers/advanceOffseasonDay.ts

import type { LeagueState } from "../../types/league";
import { aiSignFreeAgents } from "../../sim/aiSignFreeAgent";

/**
 * Advances the offseason by ONE day.
 *
 * HARD GUARANTEES:
 * - Only valid in OFFSEASON phase
 * - AI may sign free agents
 * - Offseason day increments exactly once
 */
export function handleAdvanceOffseasonDay(
  state: LeagueState
): LeagueState {
  if (state.meta.phase !== "OFFSEASON") {
    console.warn(
      "⛔ advanceOffseasonDay blocked: invalid phase",
      state.meta.phase
    );
    return state;
  }

  const seasonId = state.pointers.seasonId;
  if (!seasonId) {
    console.warn("❌ advanceOffseasonDay: no seasonId");
    return state;
  }

  const season = state.seasons[seasonId];
  if (!season) return state;

  const now = Date.now();

  /* --------------------------------------------
     1️⃣ AI FA SIGNING
  -------------------------------------------- */
  let next = aiSignFreeAgents(state);

  /* --------------------------------------------
     2️⃣ ADVANCE OFFSEASON DAY
  -------------------------------------------- */
  const nextDay = (season.offseasonDay ?? 0) + 1;

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
