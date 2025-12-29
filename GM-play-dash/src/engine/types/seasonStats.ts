import type { EntityId } from "./base";

export type BatterSeasonStats = {
  playerId: EntityId;

  G: number;
  AB: number;
  H: number;
  R: number;
  RBI: number;
  BB: number;
  SO: number;
};

export type TeamSeasonStats = {
  teamId: EntityId;

  G: number;
  W: number;
  L: number;

  runsFor: number;
  runsAgainst: number;
};
