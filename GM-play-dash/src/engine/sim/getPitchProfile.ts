import type { Player } from "../types/player";
import type { PitchProfile } from "../types/pitchArsenal";
import type { PitchType } from "../types/pitch";

export function getPitchProfile(
  player: Player,
  pitchType: PitchType
): PitchProfile | undefined {
  return player.arsenal?.pitches.find((p) => p.type === pitchType);
}
