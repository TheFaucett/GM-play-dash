import type { LeagueState } from "../../types/league";
import type { EntityId } from "../../types/base";
import type { Player } from "../../types/player";
import { getRosterStatus } from "./getRosterStatus"; // optional helper from step 1

export type RosterView = {
  teamId: EntityId;

  active26: EntityId[];   // MLB + eligible
  fortyMan: EntityId[];   // on40
  aaa: EntityId[];        // AAA assignments

  counts: {
    active26: number;
    fortyMan: number;
    aaa: number;
  };
};

export function deriveRosterView(state: LeagueState, teamId: EntityId): RosterView {
  const teamPlayers = (Object.values(state.players) as Player[]).filter(
    (p) => p && p.teamId === teamId
  );

  const fortyMan: EntityId[] = [];
  const active26: EntityId[] = [];
  const aaa: EntityId[] = [];

  for (const p of teamPlayers) {
    const roster = getRosterStatus(p); // if you didn’t add helper, use p.roster ?? defaults

    if (roster.on40) fortyMan.push(p.id);

    if (p.level === "MLB") {
      // v1 rule: MLB eligibility requires on40
      if (roster.on40) active26.push(p.id);
    } else if (p.level === "AAA") {
      aaa.push(p.id);
    }
  }

  return {
    teamId,
    active26,
    fortyMan,
    aaa,
    counts: {
      active26: active26.length,
      fortyMan: fortyMan.length,
      aaa: aaa.length,
    },
  };
}