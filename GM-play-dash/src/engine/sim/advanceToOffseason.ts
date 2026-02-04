import type { LeagueState } from "../types/league";
import { aiSignFreeAgents } from "./aiSignFreeAgent";
import { revalueAllPlayers } from "../sim/revalueAllPlayers";

/**
 * Advances the league by ONE offseason day.
 *
 * HARD GUARANTEES:
 * - Only runs during OFFSEASON
 * - AI teams may sign free agents
 * - Player values are recalculated
 * - No contracts are created or expired here
 * - Pointers, RNG, intent state preserved
 *
 * DOES NOT:
 * - End offseason
 * - Create next season
 * - Enforce payroll
 */
export function handleAdvanceOffseasonDay(
  state: LeagueState
): LeagueState {
  // 🔒 Phase guard
  if (state.meta.phase !== "OFFSEASON") {
    console.warn(
      "⛔ advanceOffseasonDay blocked: invalid phase",
      state.meta.phase
    );
    return state;
  }

  const seasonId = state.pointers.seasonId;
  if (!seasonId) {
    console.warn(
      "⚠️ advanceOffseasonDay: no seasonId in pointers"
    );
    return state;
  }

  const season = state.seasons[seasonId];
  if (!season) {
    console.error(
      "❌ advanceOffseasonDay: season not found",
      seasonId
    );
    return state;
  }

  const now = Date.now();

  console.log("📆 Advancing offseason day", {
    seasonId,
    year: season.year,
    currentOffseasonDay: season.offseasonDay ?? 0,
  });

  /* --------------------------------------------
     1️⃣ AI FREE AGENCY
  -------------------------------------------- */
  let next = aiSignFreeAgents(state);

  /* --------------------------------------------
     2️⃣ PLAYER REVALUATION (AUTHORITATIVE)
  -------------------------------------------- */
  next = revalueAllPlayers(next);

  /* --------------------------------------------
     3️⃣ ADVANCE OFFSEASON DAY
  -------------------------------------------- */
  const nextOffseasonDay =
    (season.offseasonDay ?? 0) + 1;

  next = {
    ...next,

    // 🔒 Preserve global engine state
    meta: next.meta,
    rng: next.rng,
    pointers: {
      ...next.pointers,
      seasonId,
    },
    playerIntent: {
      ...next.playerIntent,
    },
    teamIntent: {
      ...next.teamIntent,
    },

    seasons: {
      ...next.seasons,
      [seasonId]: {
        ...season,
        offseasonDay: nextOffseasonDay,
        updatedAt: now,
      },
    },

    log: [
      ...next.log,
      {
        id: `log_offseason_day_${seasonId}_${nextOffseasonDay}`,
        timestamp: now,
        type: "OFFSEASON_DAY",
        refs: [seasonId],
        description: `Advanced to offseason day ${nextOffseasonDay}`,
      },
    ],
  };

  console.log("✅ Offseason day complete", {
    offseasonDay: nextOffseasonDay,
    freeAgentsRemaining: Object.values(next.players).filter(
      (p) => p.teamId === "FA"
    ).length,
  });

  return next;
}
