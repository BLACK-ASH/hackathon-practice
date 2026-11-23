import type {
  LogFields,
  Logger,
  LogLevel,
  LogRecord,
  LogSink,
} from '#contracts/logging.ts';
import type { Clock } from '#types/time.ts';
import { systemClock } from './clock.ts';

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface CreateLoggerOptions {
  readonly level?: LogLevel;
  readonly scope?: string;
  readonly sink?: LogSink;
  readonly clock?: Clock;
}

function consoleSink(record: LogRecord): void {
  const line = `[${new Date(record.at).toISOString()}] ${record.level.toUpperCase()} ${record.scope}: ${record.message}`;
  const args: unknown[] = [line];
  if (record.fields !== undefined) args.push(record.fields);
  if (record.level === 'error') console.error(...args);
  else if (record.level === 'warn') console.warn(...args);
  else if (record.level === 'debug') console.debug(...args);
  else console.info(...args);
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const level = options.level ?? 'info';
  const scope = options.scope ?? 'app';
  const sink = options.sink ?? consoleSink;
  const clock = options.clock ?? systemClock;
  const threshold = LEVEL_WEIGHT[level];

  const write = (entryLevel: LogLevel, message: string, fields?: LogFields) => {
    if (LEVEL_WEIGHT[entryLevel] < threshold) return;
    const record: LogRecord =
      fields === undefined
        ? { level: entryLevel, scope, message, at: clock.now() }
        : { level: entryLevel, scope, message, fields, at: clock.now() };
    sink(record);
  };

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
    child: (childScope) =>
      createLogger({
        level,
        scope: `${scope}:${childScope}`,
        sink,
        clock,
      }),
  };
}
