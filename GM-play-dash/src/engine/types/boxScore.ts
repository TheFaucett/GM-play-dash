// types/boxScore.ts
import type { EntityId } from "./base";

export type GameSummary = {
  finalScore: {
    home: number;
    away: number;
  };

  innings: number;

  winnerTeamId: EntityId;
  loserTeamId: EntityId;

  endedAt: number;
};

export type TeamBox = {
  teamId: EntityId;

  runs: number;
  hits: number;
  errors: number;
  leftOnBase: number;
};

export type BatterLine = {
  playerId: EntityId;

  AB: number;
  H: number;
  R: number;
  RBI: number;

  BB: number;
  SO: number;
};

export type BoxScore = {
  summary: GameSummary;

  teams: {
    home: TeamBox;
    away: TeamBox;
  };

  batting: Record<EntityId, BatterLine>;
};
