// src/ui/DevPlayerSeasonStats.tsx
import type { LeagueState } from "../engine/types/league";
import { deriveBattingStats } from "../engine/sim/deriveBattingStats";

export function DevPlayerSeasonStats({ state }: { state: LeagueState }) {
  const seasonId = state.pointers.seasonId;
  if (!seasonId) return null;

  const season = state.seasons[seasonId];
  if (!season) return null;

  const batterStats = Object.values(season.seasonStats.batters);

  return (
    <section style={{ marginTop: 16 }}>
      <h3>🏏 Player Season Stats</h3>

      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>G</th>
            <th>AVG</th>
            <th>OBP</th>
            <th>AB</th>
            <th>H</th>
            <th>RBI</th>
          </tr>
        </thead>

        <tbody>
          {batterStats.slice(0, 20).map((s) => {
            const player = state.players[s.playerId];
            if (!player) return null;

            const { AVG, OBP } = deriveBattingStats(s);

            return (
              <tr key={s.playerId}>
                <td>{player.name}</td>
                <td>{s.G}</td>
                <td>{AVG.toFixed(3)}</td>
                <td>{OBP.toFixed(3)}</td>
                <td>{s.AB}</td>
                <td>{s.H}</td>
                <td>{s.RBI}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
