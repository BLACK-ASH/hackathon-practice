import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TypedEventBus } from '#core/events.ts';

interface TestEvents {
  ping: { value: number };
}

test('on delivers events until unsubscribed, and unsubscribe is idempotent', () => {
  const bus = new TypedEventBus<TestEvents>();
  const received: number[] = [];
  const subscription = bus.on('ping', (event) => received.push(event.value));

  bus.emit('ping', { value: 1 });
  subscription.unsubscribe();
  subscription.unsubscribe();
  bus.emit('ping', { value: 2 });

  assert.deepEqual(received, [1]);
  assert.equal(bus.listenerCount('ping'), 0);
});

test('once fires exactly once', () => {
  const bus = new TypedEventBus<TestEvents>();
  const received: number[] = [];
  bus.once('ping', (event) => received.push(event.value));

  bus.emit('ping', { value: 1 });
  bus.emit('ping', { value: 2 });

  assert.deepEqual(received, [1]);
  assert.equal(bus.listenerCount('ping'), 0);
});

test('the same handler registered twice is stored once', () => {
  const bus = new TypedEventBus<TestEvents>();
  let calls = 0;
  const handler = () => {
    calls += 1;
  };
  bus.on('ping', handler);
  bus.on('ping', handler);

  bus.emit('ping', { value: 1 });

  assert.equal(calls, 1);
});

test('a failing subscriber does not block later subscribers', () => {
  const errors: unknown[] = [];
  const bus = new TypedEventBus<TestEvents>({
    onSubscriberError: (error) => errors.push(error),
  });
  const received: number[] = [];
  bus.on('ping', () => {
    throw new Error('boom');
  });
  bus.on('ping', (event) => received.push(event.value));

  bus.emit('ping', { value: 7 });

  assert.deepEqual(received, [7]);
  assert.equal(errors.length, 1);
  assert.match(String(errors[0]), /boom/);
});

test('a rejecting async subscriber is reported without blocking dispatch', async () => {
  const errors: unknown[] = [];
  const bus = new TypedEventBus<TestEvents>({
    onSubscriberError: (error) => errors.push(error),
  });
  let secondCalled = false;
  bus.on('ping', async () => {
    throw new Error('async boom');
  });
  bus.on('ping', () => {
    secondCalled = true;
  });

  bus.emit('ping', { value: 1 });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(secondCalled, true);
  assert.equal(errors.length, 1);
});

test('unsubscribing during dispatch does not skip a subscriber from that dispatch', () => {
  const bus = new TypedEventBus<TestEvents>();
  const received: string[] = [];
  let secondSubscription: { unsubscribe(): void } | undefined;
  bus.on('ping', () => {
    received.push('first');
    secondSubscription?.unsubscribe();
  });
  secondSubscription = bus.on('ping', () => received.push('second'));

  bus.emit('ping', { value: 1 });
  bus.emit('ping', { value: 2 });

  assert.deepEqual(received, ['first', 'second', 'first']);
});

test('clear removes one event type or all event types', () => {
  const bus = new TypedEventBus<TestEvents>();
  bus.on('ping', () => undefined);
  bus.on('ping', () => undefined);
  assert.equal(bus.listenerCount('ping'), 2);

  bus.clear('ping');
  assert.equal(bus.listenerCount('ping'), 0);

  bus.on('ping', () => undefined);
  bus.clear();
  assert.equal(bus.listenerCount('ping'), 0);
});
