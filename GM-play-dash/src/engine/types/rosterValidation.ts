import type { EntityId } from "./base";

export type RosterViolation = {
  code:
    | "ACTIVE_OVER_26"
    | "FORTY_OVER_40"
    | "MLB_NOT_ON_40"
    | "DEPTH_CHART_PLAYER_NOT_ON_TEAM"
    // ✅ add these:
    | "NO_40_MAN_SPACE"
    | "NO_26_MAN_SPACE"
    | "NEEDS_WAIVERS"
    | "PLAYER_NOT_FOUND"
    | "INVALID_TEAM";
  teamId: EntityId;
  message: string;
  refs?: EntityId[];
};