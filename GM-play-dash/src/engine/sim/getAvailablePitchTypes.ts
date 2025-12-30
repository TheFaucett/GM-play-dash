import type { Player } from "../types/player";
import type { PitchType } from "../types/pitch";

export function getAvailablePitchTypes(player: Player): PitchType[] {
  if (!player.arsenal) return ["FF"];
  return player.arsenal.pitches.map((p) => p.type);
}
