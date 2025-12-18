import type { Player } from "../types/player";

const DEFAULT_RATING = 50;

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function getBatterAttributes(player: Player) {
  const r = player.ratings;

  return {
    contact: clamp(r.contact ?? DEFAULT_RATING),
    power: clamp(r.power ?? DEFAULT_RATING),
    discipline: clamp(r.discipline ?? DEFAULT_RATING),
  };
}

export function getPitcherAttributes(player: Player) {
  const r = player.ratings;

  return {
    stuff: clamp(r.stuff ?? DEFAULT_RATING),
    control: clamp(r.command ?? DEFAULT_RATING),
    movement: clamp(r.movement ?? DEFAULT_RATING),
  };
}
