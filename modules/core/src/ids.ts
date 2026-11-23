import type { IdGenerator } from '#contracts/ids.ts';
import { AppError } from './errors.ts';

function defaultRandomUUID(): string {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (typeof crypto?.randomUUID !== 'function') {
    throw new AppError(
      'not_supported',
      'crypto.randomUUID is unavailable in this runtime',
    );
  }
  return crypto.randomUUID();
}

/**
 * IDs are UUIDs with an optional entity prefix (for example `msg_...`).
 * Inject `randomUUID` in tests for deterministic output.
 */
export function createIdGenerator(
  randomUUID: () => string = defaultRandomUUID,
): IdGenerator {
  return {
    newId(prefix?: string): string {
      const id = randomUUID();
      return prefix ? `${prefix}_${id}` : id;
    },
  };
}

export const systemIdGenerator: IdGenerator = createIdGenerator();
