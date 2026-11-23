export type ErrorCode =
  | 'invalid_argument'
  | 'not_found'
  | 'conflict'
  | 'unavailable'
  | 'not_supported'
  | 'timeout'
  | 'permission_denied'
  | 'io'
  | 'protocol'
  | 'cancelled'
  | 'internal';

/** Serializable error shape for events, health reports and logs. */
export interface ErrorInfo {
  readonly code: ErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}
