// src/engine/sim/autoConfigureTeams.ts

import type { LeagueState } from "../types/league";
import type { Player } from "../types/player";

/* ==============================================
   CONFIG
============================================== */

const LINEUP_SIZE = 9;
const ROTATION_SIZE = 5;

/* ==============================================
   HELPERS
============================================== */

function isPitcher(p: Player): boolean {
  return p.role === "SP" || p.role === "RP" || p.role === "CL";
}

function batterScore(p: Player): number {
  const a = p.latents?.common.athleticism ?? 50;
  const f = p.ratings?.fielding ?? 50;
  const s = p.ratings?.speed ?? 50;
  return a * 0.5 + f * 0.3 + s * 0.2;
}

function starterScore(p: Player): number {
  const arm = p.latents?.pitcher?.armStrength ?? 50;
  const fat = p.latents?.pitcher?.fatigueResistance ?? 50;
  return arm * 0.6 + fat * 0.4;
}

/* ==============================================
   MAIN ENTRY
============================================== */

export function autoConfigureTeams(state: LeagueState): LeagueState {
  const nextTeams = { ...state.teams };

  for (const teamId of Object.keys(nextTeams)) {
    const team = nextTeams[teamId];
    if (!team) continue;

    // ---------------------------------------------
    // Collect roster players
    // ---------------------------------------------
    const roster = Object.values(state.players).filter(
      (p) => p.teamId === teamId
    );

    if (roster.length === 0) {
      console.warn("⚠️ autoConfigureTeams: empty roster", teamId);
      continue;
    }

    const batters = roster.filter((p) => !isPitcher(p));
    const pitchers = roster.filter(isPitcher);

    // ---------------------------------------------
    // LINEUP (9 best batters)
    // ---------------------------------------------
    const lineup = batters
      .slice()
      .sort((a, b) => batterScore(b) - batterScore(a))
      .slice(0, LINEUP_SIZE)
      .map((p) => p.id);

    // ---------------------------------------------
    // ROTATION (5 best starters)
    // ---------------------------------------------
    const starters = pitchers
      .filter((p) => p.role === "SP")
      .slice()
      .sort((a, b) => starterScore(b) - starterScore(a))
      .slice(0, ROTATION_SIZE)
      .map((p) => p.id);

    // ---------------------------------------------
    // BULLPEN (everyone else)
    // ---------------------------------------------
    const bullpen = pitchers
      .map((p) => p.id)
      .filter((id) => !starters.includes(id));

    // ---------------------------------------------
    // WRITE TEAM
    // ---------------------------------------------
    nextTeams[teamId] = {
      ...team,
      lineup,
      rotation: starters,
      bullpen,
      activePitcherId: starters[0],
      lineupIndex: 0,
    };

    // ---------------------------------------------
    // DEV LOG
    // ---------------------------------------------
    console.log(`🧢 Auto-configured ${team.name}`, {
      lineup: lineup.length,
      rotation: starters.length,
      bullpen: bullpen.length,
    });
  }

  return {
    ...state,
    teams: nextTeams,
  };
}
