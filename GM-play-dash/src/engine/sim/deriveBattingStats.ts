// src/engine/stats/deriveBattingStats.ts
import type { BatterSeasonStats } from "../types/seasonStats";

export function deriveBattingStats(stats: BatterSeasonStats) {
  const AB = stats.AB;
  const H = stats.H;
  const BB = stats.BB;

  const AVG = AB > 0 ? H / AB : 0;
  const OBP = AB + BB > 0 ? (H + BB) / (AB + BB) : 0;

  return {
    AVG,
    OBP,
  };
}
