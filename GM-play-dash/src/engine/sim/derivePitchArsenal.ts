import type { PitchArsenal, PitchProfile } from "../types/pitchArsenal";
import type { PitchType } from "../types/pitch";
import type { PitcherLatents } from "../types/playerLatents";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function qualifies(latent: number, threshold: number): boolean {
  return latent >= threshold;
}

export function derivePitchArsenal(
  latents: PitcherLatents
): PitchArsenal {
  const pitches: PitchProfile[] = [];

  /* ======================================
     FOUR-SEAM FASTBALL (ALWAYS EXISTS)
  ====================================== */

  pitches.push({
    type: "FF",
    velocity: clamp(88 + latents.armStrength * 0.12),
    quality: clamp(
      latents.armStrength * 0.55 +
      latents.commandFocus * 0.25 +
      latents.movementAbility * 0.2
    ),
    command: clamp(latents.releaseConsistency),
    usage: 0.45,
  });

  /* ======================================
     SINKER / CUTTER
  ====================================== */

  if (qualifies(latents.movementAbility, 55)) {
    pitches.push({
      type: "SI",
      velocity: clamp(86 + latents.armStrength * 0.1),
      quality: clamp(latents.movementAbility * 0.75),
      command: clamp(latents.commandFocus * 0.85),
      usage: 0.18,
    });
  }

  if (
    qualifies(latents.movementAbility, 60) &&
    qualifies(latents.commandFocus, 55)
  ) {
    pitches.push({
      type: "CT",
      velocity: clamp(85 + latents.armStrength * 0.1),
      quality: clamp(latents.movementAbility * 0.7),
      command: clamp(latents.commandFocus),
      usage: 0.12,
    });
  }

  /* ======================================
     BREAKING BALLS
  ====================================== */

  if (qualifies(latents.movementAbility, 65)) {
    pitches.push({
      type: "SL",
      velocity: clamp(78 + latents.armStrength * 0.05),
      quality: clamp(latents.movementAbility * 0.8),
      command: clamp(latents.commandFocus * 0.7),
      usage: 0.15,
    });
  }

  if (qualifies(latents.movementAbility, 70)) {
    pitches.push({
      type: "CU",
      velocity: clamp(72 + latents.armStrength * 0.04),
      quality: clamp(latents.movementAbility * 0.85),
      command: clamp(latents.commandFocus * 0.65),
      usage: 0.1,
    });
  }

  /* ======================================
     OFFSPEED
  ====================================== */

  if (qualifies(latents.commandFocus, 60)) {
    pitches.push({
      type: "CH",
      velocity: clamp(80 + latents.armStrength * 0.05),
      quality: clamp(latents.commandFocus * 0.75),
      command: clamp(latents.commandFocus),
      usage: 0.12,
    });
  }

  /* ======================================
     NORMALIZE USAGE
  ====================================== */

  const totalUsage = pitches.reduce((s, p) => s + p.usage, 0);
  pitches.forEach((p) => (p.usage /= totalUsage));

  return { pitches };
}
