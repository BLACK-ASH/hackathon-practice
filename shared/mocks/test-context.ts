import type { AppConfig, AppEvents, LogRecord, Logger } from '#contracts/index.ts';
import type { Subscription } from '#contracts/events.ts';
import type { IdentityService } from '#contracts/identity.ts';
import type { IdGenerator } from '#contracts/ids.ts';
import { createLogger } from '#core/logging.ts';
import { loadConfig } from '#core/config.ts';
import { TypedEventBus } from '#core/events.ts';
import { createIdentityService } from '#core/identity.ts';
import { MockClock } from './clock.ts';
import { createSequentialIdGenerator } from './ids.ts';
import { InMemoryStorage } from './storage.ts';
import { MockPeerNetwork } from './network.ts';

export interface TestContextOptions {
  readonly startAt?: number;
  readonly config?: Partial<AppConfig>;
}

export interface TestContext {
  readonly clock: MockClock;
  readonly events: TypedEventBus<AppEvents>;
  readonly logger: Logger;
  readonly logs: readonly LogRecord[];
  readonly config: AppConfig;
  readonly storage: InMemoryStorage;
  readonly network: MockPeerNetwork;
  readonly identity: IdentityService;
  readonly ids: IdGenerator;
}

/**
 * Wires the foundation's mocks together for module tests: fake clock, memory
 * logger, in-memory storage and a simulated peer network. No real I/O.
 */
export function createTestContext(
  options: TestContextOptions = {},
): TestContext {
  const clock = new MockClock(options.startAt ?? 0);
  const logs: LogRecord[] = [];
  const logger = createLogger({
    level: 'debug',
    scope: 'test',
    clock,
    sink: (record) => logs.push(record),
  });
  const events = new TypedEventBus<AppEvents>({
    onSubscriberError: (error, type) => {
      logger.warn('Event subscriber failed', { type, error });
    },
  });
  const config = loadConfig({
    env: { APP_ENV: 'test' },
    defaults: options.config,
  }).config;
  const ids = createSequentialIdGenerator();
  const storage = new InMemoryStorage();
  const network = new MockPeerNetwork({ clock, events, logger });
  const identity = createIdentityService({
    store: storage.identity,
    ids,
    clock,
    events,
    defaultDisplayName: 'Test User',
    deviceName: 'Test Device',
  });

  return { clock, events, logger, logs, config, storage, network, identity, ids };
}

/** Resolves with the next matching event, or rejects after `timeoutMs`. */
export function waitForEvent<K extends keyof AppEvents>(
  bus: import('#contracts/events.ts').EventBus<AppEvents>,
  type: K,
  predicate: (event: AppEvents[K]) => boolean = () => true,
  timeoutMs = 1000,
): Promise<AppEvents[K]> {
  return new Promise<AppEvents[K]>((resolve, reject) => {
    let subscription: Subscription | undefined;
    const timer = setTimeout(() => {
      subscription?.unsubscribe();
      reject(new Error(`Timed out waiting for event "${String(type)}"`));
    }, timeoutMs);
    subscription = bus.on(type, (event) => {
      if (!predicate(event)) return;
      clearTimeout(timer);
      subscription?.unsubscribe();
      resolve(event);
    });
  });
}
