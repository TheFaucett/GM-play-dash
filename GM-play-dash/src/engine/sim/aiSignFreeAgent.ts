import type { LeagueState } from "../types/league";
import type { Player } from "../types/player";
import type { PlayerContract } from "../types/player";

/**
 * Very simple FA signing heuristic (v1).
 *
 * Rules:
 * - Each AI team signs at most ONE FA per day
 * - Skips user-controlled team
 * - No bidding wars
 * - Needs-agnostic (for now)
 *
 * CONTRACT MODEL (PHASE A):
 * - 1-year deals
 * - Calendar-based (startYear / endYear)
 * - Stored directly on Player
 */
export function aiSignFreeAgents(
  state: LeagueState
): LeagueState {
  const now = Date.now();
  const currentYear =
    state.pointers.seasonId
      ? state.seasons[state.pointers.seasonId]?.year
      : undefined;

  // If we don't know the year, do nothing safely
  if (!currentYear) {
    console.warn("⚠️ aiSignFreeAgents: no current year available");
    return state;
  }

  let nextPlayers = { ...state.players };
  let nextLog = [...state.log];

  const freeAgents = Object.values(state.players).filter(
    (p) => p.teamId === "FA"
  );

  if (freeAgents.length === 0) {
    return state;
  }

  for (const team of Object.values(state.teams)) {
    // Skip user-controlled team
    if (team.id === state.meta.userTeamId) continue;

    // Find first available FA
    const target = freeAgents.find(
      (p) => nextPlayers[p.id]?.teamId === "FA"
    );

    if (!target) break;

    const salary =
      Math.round(baseSalary(target) * team.budgetFactor);

    const contract: PlayerContract = {
      teamId: team.id,
      startYear: currentYear,
      endYear: currentYear, // 1-year deal
      salary,
      status: "active",
    };

    nextPlayers[target.id] = {
      ...target,
      updatedAt: now,
      teamId: team.id,
      contract,
      history: {
        ...target.history,
        transactions: [
          ...target.history.transactions,
          `SIGNED_FA:${team.id}:${currentYear}`,
        ],
      },
    };

    nextLog.push({
      id: `log_ai_fa_${target.id}_${now}`,
      timestamp: now,
      type: "AI_FA_SIGN",
      refs: [target.id, team.id],
      description: `${team.name} signed ${target.name} to a 1-year deal`,
    });
  }

  return {
    ...state,
    players: nextPlayers,
    log: nextLog,
  };
}

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

function baseSalary(player: Player): number {
  switch (player.role) {
    case "SP":
      return 9;
    case "CL":
      return 7;
    case "RP":
      return 5;
    default:
      return 6;
  }
}
