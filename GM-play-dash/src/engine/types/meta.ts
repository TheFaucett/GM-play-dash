// src/engine/types/meta.ts

export type MetaState = {
  /** Schema version of the saved state */
  schemaVersion: number;

  /** When the league was first created */
  createdAt: number;

  /** Optional build or app version */
  appVersion?: string;
};
