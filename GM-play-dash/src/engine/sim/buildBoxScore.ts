import type { LeagueState } from "../types/league";
import type { BoxScore, BatterLine, TeamBox } from "../types/boxScore";


function isHit(result: string): boolean {
  return (
    result === "single" ||
    result === "double" ||
    result === "triple" ||
    result === "home_run"
  );
}


export function buildBoxScore(
  state: LeagueState,
  gameId: string
): BoxScore {
  const game = state.games[gameId];
  if (!game || game.status !== "final") {
    throw new Error("Cannot build box score for unfinished game");
  }

  const batting: Record<string, BatterLine> = {};

  let homeHits = 0;
  let awayHits = 0;

  for (const atBat of Object.values(state.atBats)) {
    if (!atBat.result) continue;

    const batterId = atBat.batterId;
    const isHome =
      state.players[batterId]?.teamId === game.homeTeamId;

    if (!batting[batterId]) {
      batting[batterId] = {
        playerId: batterId,
        AB: 0,
        H: 0,
        R: 0,
        RBI: 0,
        BB: 0,
        SO: 0,
      };
    }

    const line = batting[batterId];

    // Plate appearance
    if (atBat.result !== "walk") {
      line.AB += 1;
    }

    if (atBat.result === "walk") {
      line.BB += 1;
    }

    if (atBat.result === "strikeout") {
      line.SO += 1;
    }

    if (isHit(atBat.result)) {
      line.H += 1;
      isHome ? homeHits++ : awayHits++;
    }

    if (atBat.play?.runsScored) {
      line.RBI += atBat.play.runsScored;
    }
  }

  /* --------------------------------------------
     TEAM BOXES
  -------------------------------------------- */

  const homeTeam: TeamBox = {
    teamId: game.homeTeamId,
    runs: game.score.home,
    hits: homeHits,
    errors: 0,
    leftOnBase: 0,
  };

  const awayTeam: TeamBox = {
    teamId: game.awayTeamId,
    runs: game.score.away,
    hits: awayHits,
    errors: 0,
    leftOnBase: 0,
  };

  return {
    summary: {
      finalScore: game.score,
      innings: Math.max(
        ...game.halfInningIds.map(
          (id) => state.halfInnings[id]?.inningNumber ?? 0
        )
      ),
      winnerTeamId: game.winningTeamId!,
      loserTeamId: game.losingTeamId!,
      endedAt: game.endedAt!,
    },
    teams: {
      home: homeTeam,
      away: awayTeam,
    },
    batting,
  };
}
