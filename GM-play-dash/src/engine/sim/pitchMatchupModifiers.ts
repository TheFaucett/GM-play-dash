// sim/pitchMatchupModifiers.ts
import type { BatterArchetype } from "../types/playerArchetypes";
import type { PitchType } from "../types/pitch";

export type MatchupModifier = {
  contactQualityShift?: number; // affects weak/solid/crushed odds
  whiffBonus?: number;          // swing & miss bias
};

export const PITCH_MATCHUP_TABLE: Record<
  BatterArchetype,
  Partial<Record<PitchType, MatchupModifier>>
> = {
  // -------------------------------------------------
  // CONTACT HITTER
  // -------------------------------------------------
  contact_hitter: {
    CH: { contactQualityShift: +0.06 },
    CU: { contactQualityShift: +0.04 },
    KB: { contactQualityShift: +0.03 },
    FF: { whiffBonus: -0.05 },
    SI: { contactQualityShift: +0.03 },
    SW: { whiffBonus: +0.06 },
  },

  // -------------------------------------------------
  // POWER SLUGGER
  // -------------------------------------------------
  power_slugger: {
    FF: { contactQualityShift: +0.08 },
    CT: { contactQualityShift: +0.04 },
    SL: { whiffBonus: +0.10 },
    SW: { whiffBonus: +0.12 },
    CH: { contactQualityShift: -0.06 },
    SF: { contactQualityShift: -0.05 },
  },

  // -------------------------------------------------
  // THREE TRUE OUTCOMES
  // -------------------------------------------------
  three_true_outcomes: {
    FF: { contactQualityShift: +0.05 },
    SI: { contactQualityShift: -0.03 },
    SL: { whiffBonus: +0.14 },
    SW: { whiffBonus: +0.15 },
    CU: { whiffBonus: +0.08 },
  },

  // -------------------------------------------------
  // SPEEDY / SLAP HITTER
  // -------------------------------------------------
  speedy: {
    SI: { contactQualityShift: +0.05 },
    CT: { contactQualityShift: +0.04 },
    FF: { contactQualityShift: -0.02 },
    SL: { whiffBonus: +0.06 },
    SW: { whiffBonus: +0.08 },
    CH: { contactQualityShift: +0.03 },
  },

  // -------------------------------------------------
  // BALANCED
  // -------------------------------------------------
  balanced: {
    FF: { contactQualityShift: +0.02 },
    CT: { contactQualityShift: +0.02 },
    SI: { contactQualityShift: +0.02 },
  },
};
