import type { Player } from "../types/player";
import { validateRoster } from "./validateRoster";

/* ==============================================
   TYPES
============================================== */

export type ExpansionDraftRules = {
  protectedCount: number;   // e.g. 11–13
  maxLossesPerTeam: number; // e.g. 1 or 2
  rosterSize: number;       // usually 26
};

export type ExpansionDraftState = {
  expansionTeamId: string;

  // Ordered list of teams participating
  sourceTeamIds: string[];

  // Which team is currently up
  currentIndex: number;

  // Remaining eligible players by team
  availableByTeam: Record<string, Player[]>;

  // Loss tracking
  lossesByTeam: Record<string, number>;

  // Picks so far
  draftedPlayers: Player[];

  rules: ExpansionDraftRules;
  complete: boolean;
};

export type ExpansionDraftPickResult = {
  state: ExpansionDraftState;
  errors: string[];
};

/* ==============================================
   HELPERS
============================================== */

/**
 * Temporary protection logic.
 * This is intentionally dumb and replaceable later.
 */
function defaultProtection(
  teamPlayers: Player[],
  count: number
): Set<string> {
  return new Set(teamPlayers.slice(0, count).map((p) => p.id));
}

/* ==============================================
   STEP 1 — BUILD DRAFT STATE
============================================== */

export function buildExpansionDraftState(args: {
  expansionTeamId: string;
  teams: Record<string, Player[]>;
  rules: ExpansionDraftRules;
}): ExpansionDraftState {
  const availableByTeam: Record<string, Player[]> = {};
  const lossesByTeam: Record<string, number> = {};

  for (const teamId in args.teams) {
    const roster = args.teams[teamId];
    const protectedIds = defaultProtection(
      roster,
      args.rules.protectedCount
    );

    availableByTeam[teamId] = roster.filter(
      (p) => !protectedIds.has(p.id)
    );

    lossesByTeam[teamId] = 0;
  }

  return {
    expansionTeamId: args.expansionTeamId,
    sourceTeamIds: Object.keys(args.teams),
    currentIndex: 0,
    availableByTeam,
    lossesByTeam,
    draftedPlayers: [],
    rules: args.rules,
    complete: false,
  };
}

/* ==============================================
   STEP 2 — QUERY OPTIONS (UI USES THIS)
============================================== */

export function getExpansionDraftOptions(
  state: ExpansionDraftState
): {
  teamId: string;
  availablePlayers: Player[];
} | null {
  if (state.complete) return null;

  const teamId = state.sourceTeamIds[state.currentIndex];

  // Team may be skipped if max losses reached
  if (
    state.lossesByTeam[teamId] >=
    state.rules.maxLossesPerTeam
  ) {
    return {
      teamId,
      availablePlayers: [],
    };
  }

  return {
    teamId,
    availablePlayers: state.availableByTeam[teamId],
  };
}

/* ==============================================
   STEP 3 — APPLY PICK (VALIDATED)
============================================== */

export function applyExpansionDraftPick(args: {
  state: ExpansionDraftState;
  pickedPlayerId: string;
}): ExpansionDraftPickResult {
  const { state, pickedPlayerId } = args;
  const errors: string[] = [];

  if (state.complete) {
    return { state, errors: ["Draft already complete"] };
  }

  const teamId = state.sourceTeamIds[state.currentIndex];
  const available = state.availableByTeam[teamId];

  const picked = available.find((p) => p.id === pickedPlayerId);

  if (!picked) {
    return {
      state,
      errors: ["Illegal pick: player not available"],
    };
  }

  // Apply pick
  const nextDrafted = [
    ...state.draftedPlayers,
    { ...picked, teamId: state.expansionTeamId },
  ];

  const nextAvailableByTeam = {
    ...state.availableByTeam,
    [teamId]: available.filter((p) => p.id !== pickedPlayerId),
  };

  const nextLosses = {
    ...state.lossesByTeam,
    [teamId]: state.lossesByTeam[teamId] + 1,
  };

  // Advance index
  let nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.sourceTeamIds.length) {
    nextIndex = 0;
  }

  const complete =
    nextDrafted.length >= state.rules.rosterSize;

  // Final roster validation only when complete
  if (complete) {
    const report = validateRoster(nextDrafted);
    if (!report.valid) {
      errors.push(...report.errors);
    }
  }

  return {
    state: {
      ...state,
      availableByTeam: nextAvailableByTeam,
      lossesByTeam: nextLosses,
      draftedPlayers: nextDrafted,
      currentIndex: nextIndex,
      complete,
    },
    errors,
  };
}
