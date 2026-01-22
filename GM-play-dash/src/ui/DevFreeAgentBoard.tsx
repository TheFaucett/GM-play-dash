import type { LeagueState } from "../engine/types/league";

export function DevFreeAgentBoard({ state }: { state: LeagueState }) {
  const pool = state.playerPool;
  if (!pool) return null;

  const agents = pool.freeAgents
    .map(id => state.players[id])
    .filter(Boolean)
    .slice(0, 20); // limit for sanity

  return (
    <section style={{ marginTop: 16 }}>
      <h3>🧢 Free Agents ({pool.freeAgents.length})</h3>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Age</th>
            <th>Hand</th>
            <th>BAT</th>
            <th>SPD</th>
            <th>ARM</th>
          </tr>
        </thead>
        <tbody>
          {agents.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.role}</td>
              <td>{p.age}</td>
              <td>{p.handedness}</td>
              <td>{p.ratings.batterArchetype ?? "-"}</td>
              <td>{p.ratings.speed}</td>
              <td>{p.ratings.arm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
