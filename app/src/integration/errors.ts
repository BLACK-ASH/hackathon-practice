import { AppError, toErrorInfo } from '#core/index.ts';
import type { ErrorInfo } from '#contracts/errors.ts';

export function toUiErrorInfo(
  error: unknown,
  fallbackMessage = 'This section could not be loaded.',
): ErrorInfo {
  if (error instanceof AppError) return toErrorInfo(error);
  return toErrorInfo(
    new AppError('internal', fallbackMessage, {
      cause: error,
    }),
  );
}
