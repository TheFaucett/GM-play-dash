import type {
  BatterAttributes,
  PitcherAttributes,
} from "./deriveAttributes";
import type { BattedBallType } from "../types/battedBall";

import { weightedRoll } from "./weightedRoll";
import { applyBattedBallModifiers } from "./applyBattedBallModifiers";
import { BASE_BATTED_BALL_TABLE } from "./battedBallTable";

/**
 * Resolve batted-ball type (GB / FB / LD / PU)
 * using canonical derived attributes.
 */
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
