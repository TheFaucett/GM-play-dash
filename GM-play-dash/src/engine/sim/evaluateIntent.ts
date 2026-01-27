// src/engine/intent/evaluateIntent.ts

import type { LeagueState } from "../types/league";
import type { PlayerIntent, TeamIntent } from "../types/intent";
import type { EntityId } from "../types/base";

/* ==============================================
   CONSTANTS (TUNABLE)
============================================== */

const WEEKLY_SATISFACTION_DECAY = 2;
const WINNING_SATISFACTION_BOOST = 3;
const LOSING_SATISFACTION_PENALTY = 3;

const DIRECTION_SHIFT_THRESHOLD = 10;

/* ==============================================
   MAIN ENTRY
============================================== */

export function evaluateIntent(state: LeagueState): LeagueState {
  let next = state;

  const seasonId = state.pointers.seasonId;
  if (!seasonId) return state;

  const season = state.seasons[seasonId];
  if (!season) return state;

  /* --------------------------------------------
     UPDATE PLAYER INTENT
  -------------------------------------------- */

  const nextPlayerIntent: LeagueState["playerIntent"] = {
    ...state.playerIntent,
  };

  for (const [playerId, intent] of Object.entries(state.playerIntent)) {
    const teamId = state.players[playerId]?.teamId;
    if (!teamId || teamId === "FA") continue;

    const teamStanding = season.standings[teamId];
    if (!teamStanding) continue;

    let satisfactionDelta = -WEEKLY_SATISFACTION_DECAY;

    if (teamStanding.wins > teamStanding.losses) {
      satisfactionDelta += WINNING_SATISFACTION_BOOST;
    } else {
      satisfactionDelta -= LOSING_SATISFACTION_PENALTY;
    }

    const nextSatisfaction = clamp(
      intent.satisfaction + satisfactionDelta,
      -100,
      100
    );

    nextPlayerIntent[playerId] = {
      ...intent,
      satisfaction: nextSatisfaction,
      patience: Math.max(intent.patience - 7, 0),
    };
  }

  /* --------------------------------------------
     UPDATE TEAM INTENT
  -------------------------------------------- */

  const nextTeamIntent: LeagueState["teamIntent"] = {
    ...state.teamIntent,
  };

  for (const [teamId, intent] of Object.entries(state.teamIntent)) {
    const standing = season.standings[teamId];
    if (!standing) continue;

    const runsFor = standing.runsFor ?? 0;
    const runsAgainst = standing.runsAgainst ?? 0;

    const runDiff = runsFor - runsAgainst;

    let nextDirection = intent.direction;

    if (runDiff > DIRECTION_SHIFT_THRESHOLD) {
      nextDirection = "CONTEND";
    } else if (runDiff < -DIRECTION_SHIFT_THRESHOLD) {
      nextDirection = "REBUILD";
    }

    nextTeamIntent[teamId] = {
      ...intent,
      direction: nextDirection,
    };
  }

  /* --------------------------------------------
     RETURN UPDATED STATE
  -------------------------------------------- */

  next = {
    ...state,
    playerIntent: nextPlayerIntent,
    teamIntent: nextTeamIntent,
  };

  return next;
}

/* ==============================================
   HELPERS
============================================== */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
