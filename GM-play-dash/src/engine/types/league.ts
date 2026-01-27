// src/engine/types/league.ts

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
import type { PlayerPool } from "../sim/generatePlayerPool";
import type { PlayerIntent, TeamIntent } from "./intent";

/* ==============================================
   LEAGUE STATE
============================================== */

export type LeagueState = {
  /* --------------------------------------------
     META / RNG
  -------------------------------------------- */
  meta: MetaState;
  rng: RNGState;

  /* --------------------------------------------
     POINTERS (NAVIGATION CONTEXT)
     - Not authoritative data
     - Safe to change without affecting sim
  -------------------------------------------- */
  pointers: {
    seasonId?: string;
    userTeamId?: string;
    gameId?: string;
    halfInningId?: string;
    atBatId?: string;
  };

  /* --------------------------------------------
     CORE ENTITIES
  -------------------------------------------- */
  players: Record<string, Player>;

  // Optional external pool (FA, draft, dev tools)
  playerPool?: PlayerPool;

  teams: Record<string, Team>;
  seasons: Record<string, Season>;
  games: Record<string, Game>;
  halfInnings: Record<string, HalfInning>;
  atBats: Record<string, AtBat>;
  pitches: Record<string, Pitch>;

  /* --------------------------------------------
     INTENT / PERSONALITY LAYER (REQUIRED)
     - Always present
     - May be empty, but never undefined
  -------------------------------------------- */
  playerIntent: Record<string, PlayerIntent>;
  teamIntent: Record<string, TeamIntent>;

  /* --------------------------------------------
     ENGINE STATE
  -------------------------------------------- */
  pendingAction?: Action;
  log: LeagueEvent[];
};

/* ==============================================
   LEAGUE EVENT LOG
============================================== */

export type LeagueEvent = {
  id: string;
  timestamp: number;
  type: string;
  refs?: string[];
  description?: string;
};
