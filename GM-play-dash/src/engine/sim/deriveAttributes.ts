import type { Player } from "../types/player";
import type {
  BatterArchetype,
  PitcherArchetype,
} from "../types/playerArchetypes";

const DEFAULT_RATING = 50;

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/* =====================================================
   BATTER ATTRIBUTES
   ===================================================== */

export function getBatterAttributes(player: Player) {
  const r = player.ratings;
  const archetype: BatterArchetype | undefined =
    r.batterArchetype;

  let contact = r.contact ?? DEFAULT_RATING;
  let power = r.power ?? DEFAULT_RATING;
  let discipline = r.discipline ?? DEFAULT_RATING;
  let vision = r.vision ?? DEFAULT_RATING;

  switch (archetype) {
    case "contact_hitter":
      contact += 15;
      discipline += 8;
      vision += 6;
      power -= 10;
      break;

    case "three_true_outcomes":
      power += 16;
      discipline += 12;
      contact -= 14;
      vision -= 6;
      break;

    case "speedy":
      contact += 10;
      vision += 8;
      discipline += 4;
      power -= 16;
      break;

    case "power_slugger":
      power += 20;
      contact -= 10;
      discipline -= 6;
      vision -= 8;
      break;

    case "balanced":
    default:
      break;
  }

  return {
    contact: clamp(contact),
    power: clamp(power),
    discipline: clamp(discipline),
    vision: clamp(vision),
  };
}

/* =====================================================
   PITCHER ATTRIBUTES
   ===================================================== */

export function getPitcherAttributes(player: Player) {
  const r = player.ratings;
  const archetype: PitcherArchetype | undefined =
    r.pitcherArchetype;

  let stuff = r.stuff ?? DEFAULT_RATING;
  let control = r.command ?? DEFAULT_RATING;
  let movement = r.movement ?? DEFAULT_RATING;
  let stamina = r.stamina ?? DEFAULT_RATING;

  switch (archetype) {
    case "power_ace":
      stuff += 20;
      stamina += 8;
      control -= 6;
      movement -= 4;
      break;

    case "control_artist":
      control += 18;
      movement += 6;
      stuff -= 10;
      stamina += 4;
      break;

    case "soft_toss_lefty":
      movement += 16;
      control += 6;
      stuff -= 18;
      stamina += 6;
      break;

    case "groundball_specialist":
      movement += 20;
      control += 6;
      stuff -= 12;
      break;

    case "wild_fireballer":
      stuff += 22;
      movement += 6;
      control -= 18;
      stamina -= 4;
      break;

    default:
      break;
  }

  return {
    stuff: clamp(stuff),
    control: clamp(control),
    movement: clamp(movement),
    stamina: clamp(stamina),
  };
}

/* =====================================================
   TYPES
   ===================================================== */

export type BatterAttributes =
  ReturnType<typeof getBatterAttributes>;

export type PitcherAttributes =
  ReturnType<typeof getPitcherAttributes>;
