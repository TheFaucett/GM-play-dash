import type { BaseEntity, EntityId } from "./base";

export type PitchIntent = "attack" | "nibble" | "waste";

export type Pitch = BaseEntity & {
  atBatId: EntityId;

  pitchType: string;
  location: string; // abstract zone, not coordinates
  intent: PitchIntent;

  velocity: number;
  movement: number;

  result: "ball" | "strike" | "foul" | "in_play";
};
