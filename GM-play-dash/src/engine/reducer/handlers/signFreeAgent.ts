// src/engine/reducer/handlers/signFreeAgent.ts

import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { Player } from "../../types/player";

import { wouldExceedPayroll } from "../../sim/computeTeamPayroll";
import { deriveRosterView } from "../../sim/deriveRosterView";
import { getRosterStatus } from "../../sim/getRosterStatus";

/**
 * Signs a free agent to the user's team.
 *
 * HARD GUARANTEES:
 * - Reducer-safe (no in-place mutation)
 * - Only valid in OFFSEASON (v1)
 * - Player must currently be FA
 * - Enforces payroll budget (team.budget)
 * - Enforces roster caps (40-man + active 26)
 * - Writes contract if missing (simple deterministic fallback)
 * - Removes player from playerPool.freeAgents if that structure exists
 * - Logs the transaction
 *
 * NOTES:
 * - v1 assigns player to MLB + adds to 40-man automatically
 * - Depth chart insertion is intentionally NOT done here (keep it separate)
 * - Later: support AAA signing, waiver/DFA flows, competing offers, etc.
 */
export function handleSignFreeAgent(
  state: LeagueState,
  args: {
    playerId: EntityId;
    toTeamId: EntityId;
  }
): LeagueState {
  const { playerId, toTeamId } = args;

  // -----------------------------
  // Phase guard
  // -----------------------------
  if (state.meta.phase !== "OFFSEASON") {
    console.warn("⛔ SIGN_FREE_AGENT blocked: invalid phase", state.meta.phase);
    return state;
  }

  // -----------------------------
  // User-team guard (this action is user-only)
  // -----------------------------
  const userTeamId = state.meta.userTeamId as EntityId | null;
  if (!userTeamId) {
    console.warn("⛔ SIGN_FREE_AGENT blocked: no userTeamId set");
    return state;
  }

  if (toTeamId !== userTeamId) {
    console.warn("⛔ SIGN_FREE_AGENT blocked: can only sign to user team", {
      toTeamId,
      userTeamId,
    });
    return state;
  }

  // -----------------------------
  // Entity existence checks
  // -----------------------------
  const team = state.teams[toTeamId];
  if (!team) {
    console.warn("❌ SIGN_FREE_AGENT: team not found", toTeamId);
    return state;
  }

  const player = state.players[playerId] as Player | undefined;
  if (!player) {
    console.warn("❌ SIGN_FREE_AGENT: player not found", playerId);
    return state;
  }

  // -----------------------------
  // Must be FA
  // -----------------------------
  if (player.teamId !== ("FA" as EntityId)) {
    console.warn("⛔ SIGN_FREE_AGENT blocked: player not a free agent", {
      playerId,
      playerTeamId: player.teamId,
    });
    return state;
  }

  const now = Date.now();

  // -----------------------------
  // Determine contract AAV for payroll checks
  // - Prefer existing contract (from offers)
  // - Else create a deterministic 1-year fallback
  // -----------------------------
  const seasonId = state.pointers.seasonId as EntityId | undefined;
  const asOfYear = seasonId ? state.seasons[seasonId]?.year : undefined;

  const overall = (player as any)?.value?.overall ?? 50;

  function estAavFromOverall(ovr: number, role: Player["role"]): number {
    // simple deterministic mapping in $M
    const base = role === "BAT" ? ovr * 0.35 - 6 : ovr * 0.32 - 5;
    // clamp 1..35
    return Math.max(1, Math.min(35, Math.round(base)));
  }

  const fallbackAav = estAavFromOverall(overall, player.role);

  const aav =
    typeof player.contract?.annualSalary === "number"
      ? player.contract.annualSalary
      : fallbackAav;

  // -----------------------------
  // Payroll enforcement
  // -----------------------------
  const payrollCheck = wouldExceedPayroll(state, toTeamId, aav);

  if (payrollCheck.wouldExceed) {
    console.warn("⛔ SIGN_FREE_AGENT blocked: payroll exceeded", {
      teamId: toTeamId,
      playerId,
      aav,
      budget: payrollCheck.current.budget,
      totalPayroll: payrollCheck.current.totalPayroll,
      space: payrollCheck.current.space,
      spaceAfter: payrollCheck.spaceAfter,
    });

    return {
      ...state,
      log: [
        ...state.log,
        {
          id: `log_fa_sign_blocked_payroll_${playerId}_${toTeamId}_${now}`,
          timestamp: now,
          type: "FA_SIGN_BLOCKED_PAYROLL",
          refs: [playerId, toTeamId],
          description: `FA signing blocked: payroll exceeded (AAV $${aav}M, space after ${payrollCheck.spaceAfter}M)`,
        },
      ],
    };
  }

  // -----------------------------
  // Roster cap enforcement (v1)
  // - Signing assigns MLB + adds to 40-man
  // -----------------------------
  const view = deriveRosterView(state, toTeamId);

  if (view.fortyMan.length >= 40) {
    console.warn("⛔ SIGN_FREE_AGENT blocked: no 40-man space", {
      teamId: toTeamId,
      fortyMan: view.fortyMan.length,
    });

    return {
      ...state,
      log: [
        ...state.log,
        {
          id: `log_fa_sign_blocked_40man_${playerId}_${toTeamId}_${now}`,
          timestamp: now,
          type: "FA_SIGN_BLOCKED_40MAN",
          refs: [playerId, toTeamId],
          description: `FA signing blocked: 40-man roster full (40/40)`,
        },
      ],
    };
  }

  if (view.active26.length >= 26) {
    console.warn("⛔ SIGN_FREE_AGENT blocked: no active 26 space", {
      teamId: toTeamId,
      active26: view.active26.length,
    });

    return {
      ...state,
      log: [
        ...state.log,
        {
          id: `log_fa_sign_blocked_26man_${playerId}_${toTeamId}_${now}`,
          timestamp: now,
          type: "FA_SIGN_BLOCKED_26MAN",
          refs: [playerId, toTeamId],
          description: `FA signing blocked: active roster full (26/26)`,
        },
      ],
    };
  }

  // -----------------------------
  // Commit player update
  // -----------------------------
  const currentRoster = getRosterStatus(player);

  const nextContract =
    player.contract ??
    ({
      yearsRemaining: 0, // 0 after this season (1-year deal)
      annualSalary: aav,
      totalValue: aav,
      signedYear: typeof asOfYear === "number" ? asOfYear : new Date().getFullYear(),
      type: "guaranteed",
    } as any);

  const nextPlayer: Player = {
    ...player,
    updatedAt: now,
    teamId: toTeamId,
    level: "MLB",
    contract: {
      ...nextContract,
      annualSalary: aav,
      totalValue:
        typeof nextContract.totalValue === "number"
          ? nextContract.totalValue
          : aav,
    },
    roster: {
      ...currentRoster,
      on40: true,
      // If you want: give default options for 40-man players.
      optionYearsRemaining:
        typeof currentRoster.optionYearsRemaining === "number"
          ? currentRoster.optionYearsRemaining
          : 3,
      optionUsedThisYear: currentRoster.optionUsedThisYear ?? false,
    },
    history: {
      ...player.history,
      transactions: [
        ...(player.history?.transactions ?? []),
        `SIGNED_FA:${"FA"}->${toTeamId}`,
      ],
    },
  };

  // -----------------------------
  // Optional: remove from playerPool.freeAgents if you still keep it
  // -----------------------------
  const nextPlayerPool = (state as any).playerPool
    ? {
        ...(state as any).playerPool,
        freeAgents: Array.isArray((state as any).playerPool.freeAgents)
          ? (state as any).playerPool.freeAgents.filter((id: EntityId) => id !== playerId)
          : (state as any).playerPool.freeAgents,
      }
    : undefined;

  const next: LeagueState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: nextPlayer,
    },
    ...(nextPlayerPool ? { playerPool: nextPlayerPool } : null),
    log: [
      ...state.log,
      {
        id: `log_fa_signed_${playerId}_${toTeamId}_${now}`,
        timestamp: now,
        type: "FA_SIGNED",
        refs: [playerId, toTeamId],
        description: `Signed FA ${playerId} to ${toTeamId} (${player.role}) for $${aav}M`,
      },
    ],
  };

  return next;
}