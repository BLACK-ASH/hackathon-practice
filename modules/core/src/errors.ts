import type { ErrorCode, ErrorInfo } from '#contracts/errors.ts';

export interface AppErrorOptions {
  readonly cause?: unknown;
  readonly retryable?: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set([
  'unavailable',
  'timeout',
  'io',
]);

/**
 * The single error type thrown across module boundaries. Raw platform errors
 * are wrapped so callers see stable codes instead of socket/file messages.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'AppError';
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
    this.details = options.details;
  }

  toInfo(): ErrorInfo {
    return this.details === undefined
      ? { code: this.code, message: this.message, retryable: this.retryable }
      : {
          code: this.code,
          message: this.message,
          retryable: this.retryable,
          details: this.details,
        };
  }

  static from(
    error: unknown,
    fallbackCode: ErrorCode = 'internal',
    safeMessage?: string,
  ): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) {
      return new AppError(fallbackCode, safeMessage ?? error.message, {
        cause: error,
      });
    }
    return new AppError(fallbackCode, safeMessage ?? String(error), {
      cause: error,
    });
  }
}

export function toErrorInfo(error: unknown): ErrorInfo {
  return AppError.from(error).toInfo();
}
