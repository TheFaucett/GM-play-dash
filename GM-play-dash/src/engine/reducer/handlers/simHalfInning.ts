import type { LeagueState } from "../../types/league";
import { advanceRunners } from "../../sim/advanceRunners";
import { advanceOnWalk } from "../../sim/advanceWalk";
import { createDefaultDefense } from "../../sim/defaultDefense";

/**
 * STEP 2 — Auto-sim a full half inning (non-interactive)
 *
 * This is used when the batting team is NOT user-controlled.
 * It resolves at-bats until 3 outs are recorded.
 */
export function handleSimHalfInning(
  state: LeagueState
): LeagueState {
  console.log("[SIM] Entered handleSimHalfInning");
  const { gameId, halfInningId } = state.pointers;
  console.log("[SIM] Game ID:", gameId);
  console.log("[SIM] Half Inning ID:", halfInningId);
  if (!gameId || !halfInningId) return state;

  const game = state.games[gameId];
  const half = state.halfInnings[halfInningId];
  if (!game || !half) return state;

  // Already complete? Bail.
  if (half.outs >= 3) return state;

  const now = Date.now();

  let outs = half.outs;
  let runnerState = half.runnerState;
  let score = { ...game.score };

  // ------------------------------
  // Lineup resolution
  // ------------------------------
  const teams = (state as any).teams;
  const battingTeam = teams?.[half.battingTeamId] as
    | { id: string; lineup: string[]; lineupIndex?: number }
    | undefined;

  const lineup = battingTeam?.lineup ?? [];
  let lineupIndex =
    typeof half.lineupIndex === "number"
      ? half.lineupIndex
      : battingTeam?.lineupIndex ?? 0;

  const pitcherId = "pitcher_1"; // still stubbed — rotation comes later

  const newAtBats = { ...state.atBats };
  const newLogs = [...state.log];

  // ------------------------------
  // MAIN SIM LOOP
  // ------------------------------
  while (outs < 3) {
    const batterId =
      lineup.length > 0
        ? lineup[lineupIndex % lineup.length]
        : "batter_1";

    const atBatId = `ab_${Object.keys(newAtBats).length}`;

    // --------------------------------
    // Extremely simple outcome model (v1)
    // --------------------------------
    const roll = Math.random();

    let result:
      | "out"
      | "single"
      | "double"
      | "walk";

    if (roll < 0.65) result = "out";
    else if (roll < 0.80) result = "single";
    else if (roll < 0.90) result = "walk";
    else result = "double";

    // --------------------------------
    // Apply result
    // --------------------------------
    if (result === "walk") {
      const walked = advanceOnWalk(runnerState);
      runnerState = walked.runnerState;

      if (walked.runsScored > 0) {
        if (half.battingTeamId === game.homeTeamId) {
          score.home += walked.runsScored;
        } else {
          score.away += walked.runsScored;
        }
      }
    } else {
      const advanced = advanceRunners(runnerState, result);
      runnerState = advanced.runnerState;
      outs += advanced.outsAdded;

      if (advanced.runsScored > 0) {
        if (half.battingTeamId === game.homeTeamId) {
          score.home += advanced.runsScored;
        } else {
          score.away += advanced.runsScored;
        }
      }
    }

    // --------------------------------
    // Record at-bat
    // --------------------------------
    newAtBats[atBatId] = {
      id: atBatId,
      createdAt: now,
      updatedAt: now,
      halfInningId,
      batterId,
      pitcherId,
      count: { balls: 0, strikes: 0 },
      pitchIds: [],
      result,
    };

    newLogs.push({
      id: `log_${newLogs.length}`,
      timestamp: now,
      type: "SIM_AT_BAT",
      description: `${batterId} → ${result}`,
      refs: [atBatId],
    });

    lineupIndex++;
  }

  // ------------------------------
  // Create next half inning
  // ------------------------------
  const isTop = half.side === "top";
  const nextSide: "top" | "bottom" = isTop ? "bottom" : "top";

  const nextInningNumber = isTop
    ? half.inningNumber
    : half.inningNumber + 1;

  const nextHalfId = `half_${Object.keys(state.halfInnings).length}`;
  const nextAtBatId = `ab_${Object.keys(newAtBats).length}`;

  const nextBattingTeamId =
    nextSide === "top"
      ? game.awayTeamId
      : game.homeTeamId;

  const nextFieldingTeamId =
    nextSide === "top"
      ? game.homeTeamId
      : game.awayTeamId;

  const nextHalfInning = {
    id: nextHalfId,
    createdAt: now,
    updatedAt: now,
    gameId,
    inningNumber: nextInningNumber,
    side: nextSide,
    battingTeamId: nextBattingTeamId,
    fieldingTeamId: nextFieldingTeamId,
    defense: createDefaultDefense(nextFieldingTeamId),
    outs: 0,
    runnerState: { type: "empty" } as const,
    lineupIndex: 0,
    atBatIds: [nextAtBatId],
    currentAtBatId: nextAtBatId,
  };

  // ------------------------------
  // Return updated state
  // ------------------------------
  return {
    ...state,

    ...(teams
      ? {
          teams: {
            ...teams,
            [battingTeam?.id ?? ""]: {
              ...battingTeam,
              lineupIndex,
            },
          },
        }
      : null),

    games: {
      ...state.games,
      [gameId]: {
        ...game,
        updatedAt: now,
        score,
        halfInningIds: [...game.halfInningIds, nextHalfId],
        currentHalfInningId: nextHalfId,
      },
    },

    halfInnings: {
      ...state.halfInnings,
      [halfInningId]: {
        ...half,
        outs: 3,
        runnerState,
        lineupIndex,
      },
      [nextHalfId]: nextHalfInning,
    },

    atBats: newAtBats,

    pointers: {
      ...state.pointers,
      halfInningId: nextHalfId,
      atBatId: nextAtBatId,
    },

    log: newLogs,
  };
}
