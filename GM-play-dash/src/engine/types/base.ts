export type EntityId = string;

/**
 * BaseEntity
 * ------------
 * Every persistent object in the simulation extends this.
 * IDs are immutable. Time is explicit. Nothing magical.
 */
export type BaseEntity = {
  /** Permanent unique identifier */
  id: EntityId;

  /** Unix ms timestamp when entity was created */
  createdAt: number;

  /** Unix ms timestamp of last mutation */
  updatedAt: number;

  /**
   * Optional extensibility hooks.
   * These let future systems attach metadata without schema changes.
   */
  flags?: Record<string, boolean>;
  tags?: string[];
};