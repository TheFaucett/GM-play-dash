// MatchupPanel.tsx
import type { BatterAttributes, PitcherAttributes } from "../engine/sim/deriveAttributes";
import type { BatterArchetype, PitcherArchetype } from "../engine/types/playerArchetypes";

type Props = {
  batter: BatterAttributes & {
    name: string;
    archetype?: BatterArchetype;
  };
  pitcher: PitcherAttributes & {
    name: string;
    archetype?: PitcherArchetype;
  };
};

export function MatchupPanel({ batter, pitcher }: Props) {
  return (
    <section style={{ marginTop: 20, padding: 12, border: "1px solid #ccc" }}>
      <h3>Matchup</h3>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h4>{batter.name}</h4>
          <div>Archetype: {batter.archetype ?? "—"}</div>
          <div>Contact: {batter.contact}</div>
          <div>Power: {batter.power}</div>
          <div>Discipline: {batter.discipline}</div>
          <div>Vision: {batter.vision}</div>
        </div>

        <div style={{ flex: 1 }}>
          <h4>{pitcher.name}</h4>
          <div>Archetype: {pitcher.archetype ?? "—"}</div>
          <div>Stuff: {pitcher.stuff}</div>
          <div>Control: {pitcher.control}</div>
          <div>Movement: {pitcher.movement}</div>
          <div>Stamina: {pitcher.stamina}</div>
        </div>
      </div>
    </section>
  );
}
