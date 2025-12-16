import type { LeagueState } from "../types/league";

export function checkInvariants(state: LeagueState) {
  // Outs
  for (const hi of Object.values(state.halfInnings)) {
    if (hi.outs < 0 || hi.outs > 3) {
      throw new Error(`Invalid outs in half-inning ${hi.id}`);
    }
  }

  // Count sanity
  for (const ab of Object.values(state.atBats)) {
    if (ab.count.balls > 4 || ab.count.strikes > 3) {
      throw new Error(`Invalid count in at-bat ${ab.id}`);
    }
  }

  // Pointer integrity
  const { pointers } = state;
  if (pointers.gameId && !state.games[pointers.gameId]) {
    throw new Error("Pointer references missing game");
  }
}
