import type { LeagueState } from "../types/league";
import type { BoxScore, BatterLine } from "../types/boxScore";

export function finalizeGame(
  state: LeagueState,
  gameId: string
): LeagueState {
  const game = state.games[gameId];
  if (!game || game.status === "final") return state;

  const halfInnings = game.halfInningIds
    .map(id => state.halfInnings[id])
    .filter(Boolean);

  const atBats = Object.values(state.atBats).filter(
    ab => halfInnings.some(h => h.id === ab.halfInningId)
  );

  const batting: Record<string, BatterLine> = {};
  const teamHits = { home: 0, away: 0 };

  for (const ab of atBats) {
    const batterId = ab.batterId;
    const isHit = ["single", "double", "triple", "home_run"].includes(ab.result ?? "");

    batting[batterId] ??= {
      playerId: batterId,
      AB: 0,
      H: 0,
      R: 0,
      RBI: 0,
      BB: 0,
      SO: 0,
    };

    if (ab.result !== "walk") batting[batterId].AB += 1;
    if (isHit) batting[batterId].H += 1;
    if (ab.result === "walk") batting[batterId].BB += 1;
    if (ab.result === "strikeout") batting[batterId].SO += 1;
  }

  const boxScore: BoxScore = {
    summary: {
      finalScore: game.score,
      innings: Math.max(...halfInnings.map(h => h.inningNumber)),
      winnerTeamId:
        game.score.home > game.score.away
          ? game.homeTeamId
          : game.awayTeamId,
      loserTeamId:
        game.score.home > game.score.away
          ? game.awayTeamId
          : game.homeTeamId,
      endedAt: Date.now(),
    },
    teams: {
      home: {
        teamId: game.homeTeamId,
        runs: game.score.home,
        hits: teamHits.home,
        errors: 0,
        leftOnBase: 0,
      },
      away: {
        teamId: game.awayTeamId,
        runs: game.score.away,
        hits: teamHits.away,
        errors: 0,
        leftOnBase: 0,
      },
    },
    batting,
  };

  return {
    ...state,
    games: {
      ...state.games,
      [gameId]: {
        ...game,
        status: "final",
        endedAt: boxScore.summary.endedAt,
        winningTeamId: boxScore.summary.winnerTeamId,
        losingTeamId: boxScore.summary.loserTeamId,
        boxScore,
      },
    },
  };
}
