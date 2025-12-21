import type { BattedBallType } from "../types/battedBall";
import type {
  BatterAttributes,
  PitcherAttributes,
} from "./deriveAttributes";

export function applyBattedBallModifiers(
  base: Record<BattedBallType, number>,
  batter: BatterAttributes,
  pitcher: PitcherAttributes
): Record<BattedBallType, number> {
  const table = { ...base };

  // Batter contact skill → more line drives
  const contactBoost = (batter.contact - 50) / 300;
  table.line_drive += contactBoost;
  table.ground_ball -= contactBoost * 0.5;
  table.fly_ball -= contactBoost * 0.5;

  // Pitcher movement → more ground balls
  const movementBoost = (pitcher.movement - 50) / 300;
  table.ground_ball += movementBoost;
  table.line_drive -= movementBoost * 0.5;
  table.fly_ball -= movementBoost * 0.5;

  // Normalize
  const total =
    table.ground_ball +
    table.fly_ball +
    table.line_drive;

  table.ground_ball /= total;
  table.fly_ball /= total;
  table.line_drive /= total;

  return table;
}
