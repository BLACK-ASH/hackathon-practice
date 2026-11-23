import type { IdGenerator } from '#contracts/ids.ts';

/** Predictable IDs for assertions and UI fixtures. */
export function createSequentialIdGenerator(start = 0): IdGenerator {
  let next = start;
  return {
    newId(prefix?: string): string {
      next += 1;
      return prefix === undefined ? String(next) : `${prefix}_${next}`;
    },
  };
}
