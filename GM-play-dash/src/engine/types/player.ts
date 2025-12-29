import type { BaseEntity, EntityId } from "./base";
import type {
  BatterArchetype,
  PitcherArchetype,
} from "./playerArchetypes";

/* =====================================
   CORE ENUMS
===================================== */

export type Handedness = "R" | "L" | "S";
export type PlayerRole = "SP" | "RP" | "CL" | "BAT";

/* =====================================
   LATENT TRAITS (OPTIONAL, CANONICAL)
   These represent the *real player*
===================================== */

export type BatterLatents = {
  batSpeed: number;        // raw swing speed
  reaction: number;       // pitch recognition
  strength: number;       // raw power
  coordination: number;   // contact consistency
  athleticism: number;    // base speed / agility
};

export type PitcherLatents = {
  armStrength: number;    // velo ceiling
  commandFeel: number;    // ability to hit targets
  spinAbility: number;    // raw movement potential
  durability: number;    // fatigue + injury resistance
  deception: number;     // tunneling / release trickery
};

export type PlayerLatents = BatterLatents | PitcherLatents;

/* =====================================
   PLAYER ENTITY
===================================== */

export type Player = BaseEntity & {
  id: EntityId;

  name: string;
  age: number;
  handedness: Handedness;

  /** Current assignment */
  teamId: EntityId;
  level: "MLB" | "AAA" | "AA" | "A" | "R";

  /** Declared role (can change) */
  role: PlayerRole;

  /**
   * 🔹 OPTIONAL LATENTS
   * - Real, underlying player traits
   * - Stable over time (slow aging)
   * - Used to DERIVE ratings + attributes
   */
  latents?: PlayerLatents;

  /**
   * 🔹 RATINGS (SCOUTED / VISIBLE)
   * - Noisy, incomplete, role-biased
   * - Can lie
   * - Backwards compatible
   */
  ratings: {
    batterArchetype?: BatterArchetype;
    pitcherArchetype?: PitcherArchetype;

    // batting
    contact?: number;
    power?: number;
    discipline?: number;
    vision?: number;

    // pitching
    stuff?: number;

    /**
     * ⚠️ LEGACY NAME
     * Internally maps to "control"
     * Keep this forever for save safety
     */
    command?: number;

    movement?: number;
    stamina?: number;

    // fielding
    fielding?: number;
    arm?: number;
    speed?: number;
  };

  /** Runtime state */
  fatigue: number; // 0–100
  health: number;  // 0–100

  /** Historical context (append-only) */
  history: {
    injuries: InjuryRecord[];
    transactions: EntityId[]; // refs to log entries
  };
};

/* =====================================
   INJURIES
===================================== */

export type InjuryRecord = {
  type: string;
  startDay: number;
  endDay?: number;
};
