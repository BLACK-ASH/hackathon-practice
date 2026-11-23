import { AppError } from './errors.ts';

/**
 * Rejects with a timeout AppError if `promise` does not settle in time. The
 * underlying operation is not cancelled automatically; pass an AbortController
 * signal to the operation and abort it in `onTimeout`.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        onTimeout?.();
      } catch {
        // The timeout result still wins; a hook failure must not escape the
        // timer callback and terminate the process.
      }
      reject(new AppError('timeout', `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
