import type { LeagueState } from "../engine/types/league";

export function DevSeasonOverview({ state }: { state: LeagueState }) {
  const seasonId = state.pointers.seasonId;
  if (!seasonId) return null;

  const season = state.seasons[seasonId];
  if (!season) return null;

  const games = season.gameIds.map(id => state.games[id]).filter(Boolean);

  return (
    <section style={{ marginTop: 16 }}>
      <h3>🎮 Games ({games.length})</h3>

      <ul>
        {games.slice(0, 10).map(g => (
          <li key={g.id}>
            {g.id} [{g.status}] — {g.score.home}:{g.score.away}
            <br />
            Half innings: {g.halfInningIds.length}
          </li>
        ))}
      </ul>
    </section>
  );
}
