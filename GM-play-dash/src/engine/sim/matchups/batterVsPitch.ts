import type { BatterArchetype } from "../../types/playerArchetypes";
import type { PitchType } from "../../types/pitch";

export type MatchupModifier = {
  contact?: number;
  power?: number;
  discipline?: number;
};

export const BATTER_VS_PITCH: Record<
  BatterArchetype,
  Partial<Record<PitchType, MatchupModifier>>
> = {
  contact_hitter: {
    FF: { contact: +6 },
    SI: { contact: +4 },
    CH: { contact: +6 },
    SL: { contact: -4 },
    CU: { contact: -6 },
  },

  three_true_outcomes: {
    FF: { power: +6 },
    SL: { power: +8 },
    CU: { contact: -8 },
    CH: { discipline: +4 },
  },

  speedy: {
    SI: { contact: +6 },
    CH: { contact: +4 },
    FF: { contact: +2 },
    SL: { power: -6 },
  },

  power_slugger: {
    FF: { power: +8 },
    SL: { power: +6 },
    CU: { contact: -10 },
    CH: { discipline: -4 },
  },

  balanced: {},
};
