import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  createIdGenerator,
  createLogger,
  err,
  isErr,
  isOk,
  ok,
  systemClock,
  toErrorInfo,
  withTimeout,
} from '#core/index.ts';
import type { LogRecord } from '#contracts/logging.ts';
import { MockClock } from '#mocks/clock.ts';

test('AppError keeps stable codes and serializes to ErrorInfo', () => {
  const error = new AppError('timeout', 'too slow', { details: { peerId: 'p1' } });

  assert.equal(error.code, 'timeout');
  assert.equal(error.retryable, true);
  assert.deepEqual(error.toInfo(), {
    code: 'timeout',
    message: 'too slow',
    retryable: true,
    details: { peerId: 'p1' },
  });
});

test('AppError.from preserves AppError and wraps unknown errors', () => {
  const original = new AppError('not_found', 'missing');
  assert.equal(AppError.from(original), original);

  const wrapped = AppError.from(new Error('socket closed'), 'io');
  assert.equal(wrapped.code, 'io');
  assert.equal(wrapped.message, 'socket closed');

  const info = toErrorInfo('plain failure');
  assert.equal(info.code, 'internal');
  assert.equal(info.message, 'plain failure');
  assert.equal(info.retryable, false);
});

test('AppError.from can hide raw platform details behind a safe message', () => {
  const wrapped = AppError.from(
    new Error('connect 10.0.0.4:5000 /home/user/key.pem'),
    'io',
    'Connection failed',
  );

  assert.equal(wrapped.message, 'Connection failed');
  assert.equal(wrapped.toInfo().message, 'Connection failed');
  assert.match(String(wrapped.cause), /10\.0\.0\.4/);
});

test('result helpers discriminate correctly', () => {
  const success = ok(42);
  const failure = err(new AppError('invalid_argument', 'bad'));

  assert.equal(isOk(success), true);
  assert.equal(isErr(failure), true);
  if (isOk(success)) assert.equal(success.value, 42);
  if (isErr(failure)) assert.equal(failure.error.code, 'invalid_argument');
});

test('ID generator adds optional prefixes and can be deterministic', () => {
  let counter = 0;
  const ids = createIdGenerator(() => `uuid-${++counter}`);

  assert.equal(ids.newId(), 'uuid-1');
  assert.equal(ids.newId('msg'), 'msg_uuid-2');
});

test('logger filters by level, adds child scope and records timestamps', () => {
  const records: LogRecord[] = [];
  const clock = new MockClock(1000);
  const logger = createLogger({
    level: 'warn',
    scope: 'app',
    clock,
    sink: (record) => records.push(record),
  });

  logger.info('hidden');
  logger.warn('visible', { count: 1 });
  logger.child('network').error('failed');

  assert.equal(records.length, 2);
  assert.equal(records[0]?.scope, 'app');
  assert.equal(records[0]?.at, 1000);
  assert.deepEqual(records[0]?.fields, { count: 1 });
  assert.equal(records[1]?.scope, 'app:network');
  assert.equal(records[1]?.level, 'error');
});

test('MockClock advances and rejects invalid changes', () => {
  const clock = new MockClock(100);
  assert.equal(clock.now(), 100);
  assert.equal(clock.advance(50), 150);
  assert.equal(clock.set(7), 7);
  assert.throws(() => clock.advance(-1), /forward/);
  assert.throws(() => clock.set(-1), /non-negative/);
});

test('systemClock returns a timestamp in milliseconds', () => {
  const now = systemClock.now();
  assert.equal(typeof now, 'number');
  assert.ok(now > 1_000_000_000_000);
});

test('withTimeout rejects slow work and passes fast work through', async () => {
  await assert.rejects(
    withTimeout(
      new Promise((resolve) => setTimeout(resolve, 100)),
      5,
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === 'timeout',
  );

  assert.equal(await withTimeout(Promise.resolve('ok'), 100), 'ok');
  assert.equal(await withTimeout(Promise.resolve('no timer'), 0), 'no timer');
});

test('withTimeout aborts the underlying operation on timeout', async () => {
  const controller = new AbortController();
  await assert.rejects(
    withTimeout(
      new Promise((resolve) => setTimeout(resolve, 100)),
      5,
      () => controller.abort(),
    ),
  );
  assert.equal(controller.signal.aborted, true);
});

test('a throwing timeout hook cannot escape the timer callback', async () => {
  await assert.rejects(
    withTimeout(
      new Promise((resolve) => setTimeout(resolve, 100)),
      5,
      () => {
        throw new Error('hook failed');
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === 'timeout',
  );
});
