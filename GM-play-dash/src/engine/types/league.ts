import type { MetaState } from "./meta";
import type { RNGState } from "./rng";
import type { Player } from "./player";
import type { Team } from "./team";
import type { Season } from "./season";
import type { Game } from "./game";
import type { HalfInning } from "./halfInning";
import type { AtBat } from "./atBat";
import type { Pitch } from "./pitch";
import type { Action } from "../actions/types";
export type LeagueState = {
  meta: MetaState;
  rng: RNGState;

  pointers: {
    seasonId?: string;
    gameId?: string;
    halfInningId?: string;
    atBatId?: string;
  };

  players: Record<string, Player>;
  teams: Record<string, Team>;
  seasons: Record<string, Season>;
  games: Record<string, Game>;
  halfInnings: Record<string, HalfInning>;
  atBats: Record<string, AtBat>;
  pitches: Record<string, Pitch>;
  pendingAction?: Action;
  log: LeagueEvent[];



};

export type LeagueEvent = {
  id: string;
  timestamp: number;
  type: string;
  refs?: string[];
  description?: string;
};
