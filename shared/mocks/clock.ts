import type { Clock } from '#types/time.ts';
import { AppError } from '#core/errors.ts';

/** Controllable clock for deterministic tests; starts at epoch 0 by default. */
export class MockClock implements Clock {
  private current: number;

  constructor(startAt = 0) {
    this.current = startAt;
  }

  now(): number {
    return this.current;
  }

  advance(ms: number): number {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new AppError('invalid_argument', 'Clock can only advance forward');
    }
    this.current += ms;
    return this.current;
  }

  set(at: number): number {
    if (!Number.isFinite(at) || at < 0) {
      throw new AppError('invalid_argument', 'Clock value must be non-negative');
    }
    this.current = at;
    return this.current;
  }
}
