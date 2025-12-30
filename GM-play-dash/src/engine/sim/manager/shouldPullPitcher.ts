// src/engine/sim/manager/shouldPullPitcher.ts

import type { Player } from "../../types/player";
import type { ManagerPolicy } from "./managerPolicy";

/**
 * Decide if the manager should pull the pitcher.
 * PURE: no mutation.
 */
export function shouldPullPitcher(args: {
  pitcher: Player;
  pitchCount: number;
  fatigue: number; // 0..100
  leverage: number; // 0..1 (you can stub this)
  policy: ManagerPolicy;
  roll?: () => number; // optional RNG hook
}): boolean {
  const { pitchCount, fatigue, policy } = args;
  const roll = args.roll ?? Math.random;

  const fatigueClamped = clamp(fatigue, 0, 100);
  const pitchCountClamped = Math.max(0, Math.floor(pitchCount));

  // Hard rules: always pull
  if (fatigueClamped >= policy.hook.fatigueHard) return true;
  if (pitchCountClamped >= policy.hook.hardPitchCount) return true;

  // Soft region: probabilistic hook based on aggression and leverage
  const inSoftPitchWindow = pitchCountClamped >= policy.hook.softPitchCount;
  const inSoftFatigueWindow = fatigueClamped >= policy.hook.fatigueSoft;

  if (!inSoftPitchWindow && !inSoftFatigueWindow) return false;

  // Severity goes 0..1 as pitcher moves deeper beyond soft thresholds
  const pitchSeverity = clamp01(
    (pitchCountClamped - policy.hook.softPitchCount) /
      Math.max(1, policy.hook.hardPitchCount - policy.hook.softPitchCount)
  );

  const fatigueSeverity = clamp01(
    (fatigueClamped - policy.hook.fatigueSoft) /
      Math.max(1, policy.hook.fatigueHard - policy.hook.fatigueSoft)
  );

  const leverage = clamp01(args.leverage ?? 0.5);

  // Combine: more severity + more leverage + more aggression -> more likely hook
  const base =
    0.15 +
    pitchSeverity * 0.35 +
    fatigueSeverity * 0.40 +
    leverage * 0.20;

  const p = clamp01(base * (0.65 + policy.aggression * 0.7));

  return roll() < p;
}

/* ---------------- Helpers ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clamp01(n: number) {
  return clamp(n, 0, 1);
}
