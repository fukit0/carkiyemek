import type { Segment } from '../core/types';

export type StoredWheel = {
  readonly id: string;
  readonly segments: readonly Segment[];
  /** Monotonic counter; lets clients notice somebody else's change. */
  readonly version: number;
  readonly updatedAt: string;
};

export interface WheelStore {
  /** Returns false when the id is already taken, so the caller can retry. */
  create(wheel: StoredWheel): Promise<boolean>;
  read(id: string): Promise<StoredWheel | null>;
  write(wheel: StoredWheel): Promise<void>;
}

export interface RateLimiter {
  /** Registers one hit and returns how many happened inside the window. */
  hit(key: string, windowSeconds: number): Promise<number>;
}
