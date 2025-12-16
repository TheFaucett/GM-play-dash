import type { LeagueState } from "../../types/league";
import type { NewLeagueAction } from "../../actions/types";

export function handleNewLeague(
  _: LeagueState,
  action: NewLeagueAction
): LeagueState {
  const now = Date.now();

  return {
    meta: {
      schemaVersion: 1,
      createdAt: now,
    },
    rng: {
      seed: action.payload.seed,
      cursor: 0,
    },
    pointers: {},
    players: {},
    teams: {},
    seasons: {},
    games: {},
    halfInnings: {},
    atBats: {},
    pitches: {},
    log: [],
  };
}
