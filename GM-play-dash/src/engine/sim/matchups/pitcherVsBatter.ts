import type { PitcherArchetype } from "../../types/playerArchetypes";
import type { PitchType } from "../../types/pitch";

export type MatchupModifier = {
  contact?: number;
  power?: number;
  discipline?: number;
};

export const PITCHER_VS_BATTER: Record<
  PitcherArchetype,
  Partial<Record<PitchType, MatchupModifier>>
> = {
  power_ace: {
    FF: { contact: -8 },
    SL: { contact: -6 },
    CU: { contact: -4 },
  },

  control_artist: {
    CH: { discipline: -6 },
    CU: { discipline: -4 },
    FF: { power: -2 },
  },

  soft_toss_lefty: {
    SI: { contact: -6 },
    CH: { contact: -8 },
    FF: { power: -6 },
  },

  groundball_specialist: {
    SI: { power: -8 },
    CT: { power: -6 },
    FF: { power: -4 },
  },

  wild_fireballer: {
    FF: { power: -4, contact: -4 },
    SL: { contact: -6 },
    CH: { discipline: +6 }, // hitters wait him out
  },
};
