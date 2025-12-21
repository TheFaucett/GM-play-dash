import type { Player } from "../engine/types/player";
import type {
  BatterArchetype,
  PitcherArchetype,
} from "../engine/types/playerArchetypes";

type BatterLike =
  | Player
  | {
      batterArchetype?: BatterArchetype;
      contact?: number;
      power?: number;
      discipline?: number;
      vision?: number;
      speed?: number;
      name?: string;
    };

type PitcherLike =
  | Player
  | {
      pitcherArchetype?: PitcherArchetype;
      stuff?: number;
      control?: number;
      movement?: number;
      stamina?: number;
      name?: string;
    };

type Props = {
  batter: BatterLike;
  pitcher: PitcherLike;
};

function isPlayer(x: unknown): x is Player {
  return !!x && typeof x === "object" && "ratings" in (x as any);
}

export function MatchupPanel({ batter, pitcher }: Props) {
  const batterName = isPlayer(batter) ? batter.name : batter.name ?? "Batter";
  const pitcherName = isPlayer(pitcher) ? pitcher.name : pitcher.name ?? "Pitcher";

  const batterArchetype = isPlayer(batter)
    ? (batter.ratings.archetype as BatterArchetype | undefined)
    : batter.batterArchetype;

  const pitcherArchetype = isPlayer(pitcher)
    ? (pitcher.ratings.archetype as PitcherArchetype | undefined)
    : pitcher.pitcherArchetype;

  const batterRatings = isPlayer(batter) ? batter.ratings : batter;
  const pitcherRatings = isPlayer(pitcher) ? pitcher.ratings : pitcher;

  return (
    <section style={{ marginTop: 20, padding: 12, border: "1px solid #ccc" }}>
      <h3>Matchup</h3>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h4>{batterName}</h4>
          <div>Archetype: {batterArchetype ?? "—"}</div>
          <div>Contact: {batterRatings.contact ?? "—"}</div>
          <div>Power: {batterRatings.power ?? "—"}</div>
          <div>Discipline: {batterRatings.discipline ?? "—"}</div>
          <div>Vision: {batterRatings.vision ?? "—"}</div>
          {"speed" in batterRatings && <div>Speed: {(batterRatings as any).speed ?? "—"}</div>}
        </div>

        <div style={{ flex: 1 }}>
          <h4>{pitcherName}</h4>
          <div>Archetype: {pitcherArchetype ?? "—"}</div>
          <div>Stuff: {pitcherRatings.stuff ?? "—"}</div>
          <div>Control: {(pitcherRatings as any).control ?? (pitcherRatings as any).command ?? "—"}</div>
          <div>Movement: {pitcherRatings.movement ?? "—"}</div>
          <div>Stamina: {(pitcherRatings as any).stamina ?? "—"}</div>
        </div>
      </div>
    </section>
  );
}
