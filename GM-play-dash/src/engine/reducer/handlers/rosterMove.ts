import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";

import { applyRosterMove } from "../../sim/applyRosterMove";

/**
 * Reducer handler for UI-driven roster moves.
 *
 * Policy:
 * - strict: true (illegal moves do nothing)
 * - on failure: state unchanged, but adds a log entry w/ violation codes
 */
export function handleRosterMove(
  state: LeagueState,
  payload: {
    move:
      | { type: "ADD_TO_40"; playerId: EntityId }
      | { type: "REMOVE_FROM_40"; playerId: EntityId }
      | { type: "PROMOTE_TO_MLB"; playerId: EntityId }
      | { type: "DEMOTE_TO_AAA"; playerId: EntityId };
  }
): LeagueState {
  const now = Date.now();

  const res = applyRosterMove(state, payload.move, { strict: true, now });

  if (res.ok) {
    // You can optionally log successes too, but keep it quiet for now.
    return res.next;
  }

  const codes = res.violations.map((v) => v.code).join(", ");

  return {
    ...state,
    log: [
      ...state.log,
      {
        id: `log_roster_move_failed_${payload.move.type}_${payload.move.playerId}_${now}`,
        timestamp: now,
        type: "ROSTER_MOVE_FAILED",
        refs: [payload.move.playerId],
        description: `Roster move failed (${payload.move.type}) for ${payload.move.playerId}: ${codes}`,
      },
    ],
  };
}