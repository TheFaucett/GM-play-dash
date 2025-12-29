import type { BoxScore } from "../engine/types/boxScore";

type Props = {
  boxScore: BoxScore;
};

export function BoxScorePanel({ boxScore }: Props) {
  const { summary, teams, batting } = boxScore;

  const teamRows = [
    teams.home,
    teams.away,
  ];

  const battingLines = Object.values(batting);

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Final Score</h2>

      <div style={{ fontSize: 18, marginBottom: 12 }}>
        <strong>Home</strong> {summary.finalScore.home} —{" "}
        <strong>Away</strong> {summary.finalScore.away}
      </div>

      <h3>Team Totals</h3>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Team</th>
            <th>R</th>
            <th>H</th>
            <th>E</th>
            <th>LOB</th>
          </tr>
        </thead>
        <tbody>
          {teamRows.map((team) => (
            <tr key={team.teamId}>
              <td>{team.teamId}</td>
              <td>{team.runs}</td>
              <td>{team.hits}</td>
              <td>{team.errors}</td>
              <td>{team.leftOnBase}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 16 }}>Batting Lines</h3>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Player</th>
            <th>AB</th>
            <th>H</th>
            <th>R</th>
            <th>RBI</th>
            <th>BB</th>
            <th>SO</th>
          </tr>
        </thead>
        <tbody>
          {battingLines.map((line, idx) => (
            <tr key={`${line.playerId}-${idx}`}>
              <td>{line.playerId}</td>
              <td>{line.AB}</td>
              <td>{line.H}</td>
              <td>{line.R}</td>
              <td>{line.RBI}</td>
              <td>{line.BB}</td>
              <td>{line.SO}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
