export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Readonly<Record<string, unknown>>;

export interface LogRecord {
  readonly level: LogLevel;
  readonly scope: string;
  readonly message: string;
  readonly fields?: LogFields;
  readonly at: number;
}

export type LogSink = (record: LogRecord) => void;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(scope: string): Logger;
}
