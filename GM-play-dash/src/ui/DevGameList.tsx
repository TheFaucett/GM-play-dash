import type { LeagueState } from "../engine/types/league";

export function DevGameList({ state }: { state: LeagueState }) {
  const games = Object.values(state.games);

  return (
    <section style={{ marginTop: 12 }}>
      <h3>🎮 Games ({games.length})</h3>

      <ul>
        {games.slice(0, 10).map(game => (
          <li key={game.id}>
            <strong>{game.id}</strong>{" "}
            [{game.status}] — {game.score.home}:{game.score.away}
            <div style={{ fontSize: 12 }}>
              Half innings: {game.halfInningIds.length}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
