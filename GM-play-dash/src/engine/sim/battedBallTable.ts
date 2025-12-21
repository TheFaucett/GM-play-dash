import type { BattedBallType } from "../types/battedBall";

export const BASE_BATTED_BALL_TABLE: Record<BattedBallType, number> = {
  ground_ball: 0.44,
  fly_ball: 0.33,
  line_drive: 0.18,
  pop_up: 0.05,
};
