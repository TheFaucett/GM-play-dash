import type { LeagueState } from "../types/league";
import type { EntityId } from "../types/base";
import type { Player } from "../types/player";

import { deriveRosterView } from "./deriveRosterView";
import { validateRosterView, type RosterViolation } from "./validateRosterView";
import { getRosterStatus } from "./getRosterStatus";

/**
 * Step 3A: One canonical roster mutation primitive.
 *
 * Supports AAA-only for now:
 * - 40-man membership via player.roster.on40
 * - Active 26 derived from (level === "MLB" && on40 === true)
 * - Options for MLB -> AAA demotions (lite)
 *
 * Extend later:
 * - Add AA/A/R by expanding level buckets in deriveRosterView
 * - Add DFA/waivers as a timed state machine
 */

export type RosterMove =
  | { type: "ADD_TO_40"; playerId: EntityId }
  | { type: "REMOVE_FROM_40"; playerId: EntityId }
  | { type: "PROMOTE_TO_MLB"; playerId: EntityId }
  | { type: "DEMOTE_TO_AAA"; playerId: EntityId };

export type RosterMoveResult = {
  next: LeagueState;
  ok: boolean;
  violations: RosterViolation[];
};

/* ======================================================
   HELPERS
====================================================== */

function nowTs(opts?: { now?: number }) {
  return typeof opts?.now === "number" ? opts.now : Date.now();
}

function updatePlayer(
  state: LeagueState,
  playerId: EntityId,
  patch: (p: Player) => Player
): LeagueState {
  const p = state.players[playerId] as Player | undefined;
  if (!p) return state;

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: patch(p),
    },
  };
}

function removeId(list: EntityId[] | undefined, id: EntityId): EntityId[] {
  if (!list || list.length === 0) return [];
  return list.filter((x) => x !== id);
}

function removeFromDepthCharts(
  state: LeagueState,
  teamId: EntityId,
  playerId: EntityId
): LeagueState {
  const team = state.teams[teamId];
  if (!team) return state;

  const nextTeam = {
    ...team,
    lineup: removeId(team.lineup, playerId),
    rotation: removeId(team.rotation, playerId),
    bullpen: removeId(team.bullpen, playerId),
    // If you later add bench/40 lists on team, remove there too.
  };

  return {
    ...state,
    teams: {
      ...state.teams,
      [teamId]: nextTeam,
    },
  };
}

function violation(
  code: RosterViolation["code"],
  teamId: EntityId,
  message: string,
  refs?: EntityId[]
): RosterViolation {
  return { code, teamId, message, refs };
}

/* ======================================================
   MAIN
====================================================== */

export function applyRosterMove(
  state: LeagueState,
  move: RosterMove,
  opts?: {
    /** If true, we will not apply illegal moves; we return state unchanged + violations. */
    strict?: boolean;
    /** Provide a stable timestamp if you want repeatable logs. */
    now?: number;
  }
): RosterMoveResult {
  const strict = opts?.strict ?? true;
  const now = nowTs(opts);

  const p0 = state.players[move.playerId] as Player | undefined;
  if (!p0) {
    return {
      next: state,
      ok: false,
      violations: [violation("PLAYER_NOT_FOUND", "FA" as EntityId, `Player not found: ${move.playerId}`, [move.playerId])],
    };
  }

  const teamId = p0.teamId as EntityId;
  if (!teamId || teamId === ("FA" as EntityId)) {
    return {
      next: state,
      ok: false,
      violations: [violation("INVALID_TEAM", "FA" as EntityId, `Player is not on a team: ${p0.name} (${p0.id})`, [p0.id])],
    };
  }

  // Snapshot roster view before (for capacity checks)
  const beforeView = deriveRosterView(state, teamId);

  let next = state;
  const v: RosterViolation[] = [];

  /* --------------------------------------------
     MOVE TYPES
  -------------------------------------------- */

  if (move.type === "ADD_TO_40") {
    // Capacity check
    const alreadyOn40 = getRosterStatus(p0).on40;
    if (!alreadyOn40 && beforeView.fortyMan.length >= 40) {
      v.push(
        violation(
          "NO_40_MAN_SPACE",
          teamId,
          `Cannot add to 40-man: roster full (40/40)`,
          [p0.id]
        )
      );
      return { next: strict ? state : state, ok: !strict, violations: v };
    }

    next = updatePlayer(next, p0.id, (p) => {
      const roster = getRosterStatus(p);
      if (roster.on40) return p;
      return {
        ...p,
        updatedAt: now,
        roster: {
          ...roster,
          on40: true,
        },
      };
    });
  }

  if (move.type === "REMOVE_FROM_40") {
    // Remove from 40-man; if MLB, push to AAA as a safe default.
    // Also scrub depth charts so you don't accidentally play them.
    next = updatePlayer(next, p0.id, (p) => {
      const roster = getRosterStatus(p);
      if (!roster.on40 && p.level !== "MLB") return p;

      return {
        ...p,
        updatedAt: now,
        level: p.level === "MLB" ? "AAA" : p.level,
        roster: {
          ...roster,
          on40: false,
        },
      };
    });

    next = removeFromDepthCharts(next, teamId, p0.id);
  }

  if (move.type === "PROMOTE_TO_MLB") {
    const roster = getRosterStatus(p0);

    // Eligibility: must be on 40-man
    if (!roster.on40) {
      v.push(
        violation(
          "MLB_NOT_ON_40",
          teamId,
          `Cannot promote: player not on 40-man (${p0.name})`,
          [p0.id]
        )
      );
      return { next: strict ? state : state, ok: !strict, violations: v };
    }

    // Capacity: active 26 cannot exceed 26
    // (Active 26 is derived as MLB+on40; promoting adds one to that set.)
    const alreadyMLB = p0.level === "MLB";
    if (!alreadyMLB && beforeView.active26.length >= 26) {
      v.push(
        violation(
          "NO_26_MAN_SPACE",
          teamId,
          `Cannot promote: active roster full (26/26)`,
          [p0.id]
        )
      );
      return { next: strict ? state : state, ok: !strict, violations: v };
    }

    next = updatePlayer(next, p0.id, (p) => ({
      ...p,
      updatedAt: now,
      level: "MLB",
    }));
  }

  if (move.type === "DEMOTE_TO_AAA") {
    const roster = getRosterStatus(p0);

    // Already AAA: no-op
    if (p0.level === "AAA") {
      return { next: state, ok: true, violations: [] };
    }

    // Options (lite)
    const remaining = roster.optionYearsRemaining ?? 0;
    const usedThisYear = roster.optionUsedThisYear ?? false;

    // If not on 40-man, we still allow demotion to AAA (it’s a simple assignment).
    // If on 40-man but has no options, demotion requires waivers (future system).
    if (remaining <= 0) {
      v.push(
        violation(
          "NEEDS_WAIVERS",
          teamId,
          `Cannot demote: no options remaining (waivers/DFA needed) (${p0.name})`,
          [p0.id]
        )
      );
      return { next: strict ? state : state, ok: !strict, violations: v };
    }

    // Mark option used this year (do NOT decrement optionYearsRemaining here;
    // do that once at season rollover if optionUsedThisYear is true).
    next = updatePlayer(next, p0.id, (p) => {
      const r = getRosterStatus(p);
      return {
        ...p,
        updatedAt: now,
        level: "AAA",
        roster: usedThisYear
          ? r
          : {
              ...r,
              optionUsedThisYear: true,
            },
      };
    });

    // Optional: if demoted, remove from depth charts (so startGame doesn't pick them)
    next = removeFromDepthCharts(next, teamId, p0.id);
  }

  /* --------------------------------------------
     POST-VALIDATION (TEAM-LEVEL)
  -------------------------------------------- */

  const afterView = deriveRosterView(next, teamId);
  const violations = [...v, ...validateRosterView(next, afterView)];

  // In strict mode, we already early-returned on move-illegal cases.
  // Here, violations are mostly "structural" (over 26/40, drift).
  // You can choose to revert on those too; for now, we report them.
  return {
    next,
    ok: violations.length === 0,
    violations,
  };
}