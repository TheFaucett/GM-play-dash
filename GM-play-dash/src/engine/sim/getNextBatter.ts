import type { Team } from "../types/team";

export function getCurrentBatter(team: Team): string {
  return team.lineup[team.lineupIndex];
}

export function advanceLineup(team: Team): Team {
  return {
    ...team,
    lineupIndex: (team.lineupIndex + 1) % team.lineup.length,
  };
}
