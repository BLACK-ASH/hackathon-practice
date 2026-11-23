import type { Clock } from '#types/time.ts';

export const systemClock: Clock = {
  now: () => Date.now(),
};
