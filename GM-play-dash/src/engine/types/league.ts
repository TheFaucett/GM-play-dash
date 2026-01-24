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

/* ==============================================
   LEAGUE STATE
============================================== */

export type LeagueState = {
  meta: MetaState;
  rng: RNGState;

  /* --------------------------------------------
     POINTERS (CURRENT CONTEXT)
     - These are NOT data, just navigation state
  -------------------------------------------- */
  pointers: {
    seasonId?: string;
    userTeamId?: string;      // ✅ STEP 1: USER FRANCHISE
    gameId?: string;
    halfInningId?: string;
    atBatId?: string;
  };

  /* --------------------------------------------
     CORE ENTITIES
  -------------------------------------------- */
  players: Record<string, Player>;

  // Optional pool for FA / drafts / dev tools
  playerPool?: PlayerPool;

  teams: Record<string, Team>;
  seasons: Record<string, Season>;
  games: Record<string, Game>;
  halfInnings: Record<string, HalfInning>;
  atBats: Record<string, AtBat>;
  pitches: Record<string, Pitch>;

  /* --------------------------------------------
     ENGINE
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
