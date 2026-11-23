/**
 * Minimal clock port. Use the system clock in production and a fake clock in
 * tests so timestamps and timeouts are deterministic.
 */
export interface Clock {
  now(): number;
}
