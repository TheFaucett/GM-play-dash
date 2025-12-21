import type { EntityId } from "../types/base";

export function createDefaultDefense(teamId: EntityId) {
  return {
    infield: [
      `${teamId}_1B`,
      `${teamId}_2B`,
      `${teamId}_SS`,
      `${teamId}_3B`,
    ],
    outfield: [
      `${teamId}_LF`,
      `${teamId}_CF`,
      `${teamId}_RF`,
    ],
  };
}
