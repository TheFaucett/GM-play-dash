// src/engine/sim/normalizeContractUnits.ts

import type { LeagueState } from "../types/league";
import type { Player } from "../types/player";
import type { EntityId } from "../types/base";

/**
 * Convert any legacy contract money fields from dollars -> $M.
 *
 * Canonical unit after running:
 * - annualSalary: $M
 * - totalValue: $M
 *
 * Heuristic:
 * - if value >= 1000, treat as dollars and divide by 1_000_000.
 */
function toMillions(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  if (n <= 0) return n; // keep 0 / negative as-is (future: dead money)
  return n >= 1000 ? n / 1_000_000 : n;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100; // 2 decimals is plenty
}

export function normalizeAllPlayerContractsToMillions(
  state: LeagueState,
  opts?: { now?: number }
): LeagueState {
  const now = typeof opts?.now === "number" ? opts.now : Date.now();

  let changed = 0;
  const nextPlayers: LeagueState["players"] = { ...state.players };

  for (const [id, raw] of Object.entries(state.players)) {
    const p = raw as Player;
    if (!p?.contract) continue;

    const annualM = toMillions(p.contract.annualSalary);
    const totalM = toMillions(p.contract.totalValue);

    // If neither field exists / changes, skip
    const nextAnnual = typeof annualM === "number" ? roundMoney(annualM) : p.contract.annualSalary;
    const nextTotal = typeof totalM === "number" ? roundMoney(totalM) : p.contract.totalValue;

    const didChange =
      nextAnnual !== p.contract.annualSalary || nextTotal !== p.contract.totalValue;

    if (!didChange) continue;

    changed++;

    nextPlayers[id] = {
      ...p,
      updatedAt: now,
      contract: {
        ...p.contract,
        annualSalary: nextAnnual,
        totalValue: nextTotal,
      },
      history: {
        ...p.history,
        transactions: [
          ...(p.history?.transactions ?? []),
          `CONTRACT_UNITS_NORMALIZED`,
        ] as EntityId[],
      },
    };
  }

  if (changed === 0) return state;

  return {
    ...state,
    players: nextPlayers,
    log: [
      ...state.log,
      {
        id: `log_normalize_contract_units_${now}`,
        timestamp: now,
        type: "NORMALIZE_CONTRACT_UNITS",
        description: `Normalized contract units for ${changed} players (dollars -> $M).`,
      },
    ],
  };
}