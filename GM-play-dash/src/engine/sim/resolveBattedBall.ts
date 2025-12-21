import type {
  BatterAttributes,
  PitcherAttributes,
  BattedBallType,
} from "./types";

import { weightedRoll } from "./weightedRoll";
import { applyBattedBallModifiers } from "./applyBattedBallModifiers";
import { BASE_BATTED_BALL_TABLE } from "./battedBallTable";

export function resolveBattedBall(
  batter: BatterAttributes,
  pitcher: PitcherAttributes,
  roll: () => number
): BattedBallType {
  const table = applyBattedBallModifiers(
    BASE_BATTED_BALL_TABLE,
    batter,
    pitcher
  );

  return weightedRoll(table, roll);
}
