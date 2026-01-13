import type { LeagueState } from "../engine/types/league";

export function DevSeasonProgress({ state }: { state: LeagueState }) {
  const seasonId = state.pointers.seasonId;
  if (!seasonId) return null;

  const season = state.seasons[seasonId];
  if (!season) return null;

  const { currentGameIndex, gameIds } = season;
  const totalGames = gameIds.length;

  const lastGameId =
    currentGameIndex > 0
      ? gameIds[currentGameIndex - 1]
      : null;

  const lastGame =
    lastGameId ? state.games[lastGameId] : null;

  return (
    <section
      style={{
        marginTop: 12,
        padding: 10,
        border: "1px solid #ccc",
        background: "#fafafa",
      }}
    >
      <h4>📅 Season Progress</h4>

      <div>
        Game <strong>{currentGameIndex}</strong> /{" "}
        <strong>{totalGames}</strong>
      </div>

      {lastGame && (
        <div style={{ marginTop: 8 }}>
          <strong>Last Game:</strong>
          <div>
            {lastGame.awayTeamId} @ {lastGame.homeTeamId}
          </div>
          <div>
            Final: {lastGame.score.away} – {lastGame.score.home}
          </div>
          <div>
            Winner:{" "}
            <strong>{lastGame.winningTeamId}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
