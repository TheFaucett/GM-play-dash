import type { BattedBallType } from "../types/battedBall";
import type { Player } from "../types/player";

export type DefensiveResult = {
  outsAdded: number;
  basesAllowed: number; // 0–4
  error?: boolean;
};

export function resolveDefense(
  ballType: BattedBallType,
  batterSpeed: number,
  fielders: Player[],
  rng: () => number
): DefensiveResult {
  const avgFielding =
    fielders.reduce(
      (sum, f) => sum + (f.ratings.fielding ?? 50),
      0
    ) / fielders.length;

  const difficulty =
    ballType === "ground_ball" ? 0.6 :
    ballType === "line_drive" ? 0.85 :
    ballType === "fly_ball" ? 0.7 :
    0.9; // pop-up easiest

  const playChance =
    avgFielding / 100 * difficulty;

  const roll = rng();

  // Clean out
  if (roll < playChance) {
    return { outsAdded: 1, basesAllowed: 0 };
  }

  // Beat the throw
  if (batterSpeed > avgFielding && roll > 0.95) {
    return { outsAdded: 0, basesAllowed: 1 };
  }

  // Hit finds grass
  return {
    outsAdded: 0,
    basesAllowed:
      ballType === "fly_ball" ? 2 : 1,
  };
}
