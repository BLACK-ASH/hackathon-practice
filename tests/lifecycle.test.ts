import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  AppModule,
  ModuleContext,
  ModuleHealthReport,
  ModuleStartReport,
} from '#contracts/lifecycle.ts';
import { DefaultModuleRegistry } from '#core/lifecycle.ts';
import { createTestContext } from '#mocks/test-context.ts';
import type { TestContext } from '#mocks/test-context.ts';

function createRegistry(
  context: TestContext,
  modules: readonly AppModule[],
  initTimeoutMs = 1000,
): DefaultModuleRegistry {
  const registry = new DefaultModuleRegistry({
    logger: context.logger,
    clock: context.clock,
    events: context.events,
    config: context.config,
    initTimeoutMs,
  });
  for (const module of modules) registry.register(module);
  return registry;
}

function module(
  id: string,
  initialize: (context: ModuleContext) => Promise<void> | void,
  shutdown?: () => Promise<void> | void,
  optional = false,
): AppModule {
  return {
    id,
    optional,
    initialize: async (context) => {
      await initialize(context);
    },
    ...(shutdown === undefined
      ? {}
      : { shutdown: async () => shutdown() }),
  };
}

function healthOf(
  report: readonly ModuleHealthReport[],
  moduleId: string,
): ModuleHealthReport | undefined {
  return report.find((item) => item.moduleId === moduleId);
}

test('modules start in registration order and report ready', async () => {
  const context = createTestContext();
  const calls: string[] = [];
  const registry = createRegistry(context, [
    module('network', () => {
      calls.push('network');
    }),
    module('messaging', () => {
      calls.push('messaging');
    }),
  ]);

  const report = await registry.start();

  assert.deepEqual(calls, ['network', 'messaging']);
  assert.deepEqual(report.failed, []);
  assert.deepEqual(
    report.modules.map((item) => item.status),
    ['ready', 'ready'],
  );
  assert.equal(healthOf(registry.health(), 'network')?.status, 'ready');
  assert.equal(registry.get('messaging')?.id, 'messaging');
});

test('a failing module is isolated and does not prevent later modules', async () => {
  const context = createTestContext();
  const calls: string[] = [];
  const registry = createRegistry(context, [
    module('network', () => {
      calls.push('network');
    }),
    module('messaging', () => {
      throw new Error('bad transport');
    }),
    module('groups', () => {
      calls.push('groups');
    }),
  ]);

  const report = await registry.start();

  assert.deepEqual(calls, ['network', 'groups']);
  assert.deepEqual(report.failed, ['messaging']);
  const messaging = healthOf(registry.health(), 'messaging');
  assert.equal(messaging?.status, 'failed');
  assert.equal(messaging?.error?.code, 'internal');
  assert.match(messaging?.error?.message ?? '', /bad transport/);
  assert.equal(healthOf(registry.health(), 'groups')?.status, 'ready');
});

test('module initialization times out without blocking startup', async () => {
  const context = createTestContext();
  let timedOutSignal: AbortSignal | undefined;
  const registry = createRegistry(
    context,
    [
      module('network', (moduleContext) => {
        timedOutSignal = moduleContext.signal;
        return new Promise<void>(() => undefined);
      }),
      module('storage', () => undefined),
    ],
    10,
  );

  const report = await registry.start();

  assert.deepEqual(report.failed, ['network']);
  assert.equal(healthOf(registry.health(), 'network')?.error?.code, 'timeout');
  assert.equal(healthOf(registry.health(), 'storage')?.status, 'ready');
  await registry.stop();
  assert.equal(timedOutSignal?.aborted, true);
});

test('modules can report degraded health during and after startup', async () => {
  const context = createTestContext();
  let savedContext: ModuleContext | undefined;
  const registry = createRegistry(context, [
    module('network', (moduleContext) => {
      savedContext = moduleContext;
      moduleContext.report('degraded', 'discovery unavailable');
    }),
  ]);

  const report: ModuleStartReport = await registry.start();
  assert.deepEqual(report.failed, []);
  assert.equal(healthOf(registry.health(), 'network')?.status, 'degraded');
  assert.equal(
    healthOf(registry.health(), 'network')?.message,
    'discovery unavailable',
  );

  savedContext?.report('ready');
  assert.equal(healthOf(registry.health(), 'network')?.status, 'ready');
});

test('shutdown runs in reverse order, aborts signals and runs cleanups last', async () => {
  const context = createTestContext();
  const calls: string[] = [];
  let networkSignal: AbortSignal | undefined;
  let messagingSignal: AbortSignal | undefined;
  const registry = createRegistry(context, [
    module(
      'network',
      (moduleContext) => {
        networkSignal = moduleContext.signal;
        calls.push('init network');
        moduleContext.onCleanup(() => {
          calls.push('cleanup network');
        });
      },
      () => {
        calls.push('stop network');
      },
    ),
    module(
      'messaging',
      (moduleContext) => {
        messagingSignal = moduleContext.signal;
        calls.push('init messaging');
        moduleContext.onCleanup(() => {
          calls.push('cleanup messaging 1');
        });
        moduleContext.onCleanup(() => {
          calls.push('cleanup messaging 2');
        });
      },
      () => {
        calls.push('stop messaging');
      },
    ),
  ]);

  await registry.start();
  await registry.stop();

  assert.deepEqual(calls, [
    'init network',
    'init messaging',
    'stop messaging',
    'cleanup messaging 2',
    'cleanup messaging 1',
    'stop network',
    'cleanup network',
  ]);
  assert.equal(networkSignal?.aborted, true);
  assert.equal(messagingSignal?.aborted, true);
  assert.deepEqual(
    registry.health().map((item) => item.status),
    ['stopped', 'stopped'],
  );
});

test('a shutdown failure still runs cleanup and stops other modules', async () => {
  const context = createTestContext();
  const calls: string[] = [];
  const registry = createRegistry(context, [
    module(
      'network',
      (moduleContext) => {
        moduleContext.onCleanup(() => {
          calls.push('cleanup network');
        });
      },
      () => {
        throw new Error('socket close failed');
      },
    ),
    module(
      'storage',
      () => undefined,
      () => {
        calls.push('stop storage');
      },
    ),
  ]);

  await registry.start();
  await registry.stop();

  assert.deepEqual(calls, ['stop storage', 'cleanup network']);
  assert.equal(healthOf(registry.health(), 'network')?.status, 'failed');
  assert.equal(healthOf(registry.health(), 'storage')?.status, 'stopped');
});

test('registration validates state and duplicate IDs', async () => {
  const context = createTestContext();
  const registry = createRegistry(context, [module('network', () => undefined)]);

  assert.throws(
    () => registry.register(module('network', () => undefined)),
    (error: { code?: string }) => error.code === 'conflict',
  );

  await registry.start();
  assert.throws(
    () => registry.register(module('late', () => undefined)),
    (error: { code?: string }) => error.code === 'conflict',
  );
  assert.equal((await registry.start()).failed.length, 0);
  await registry.stop();
  await assert.rejects(
    registry.start(),
    (error: { code?: string }) => error.code === 'conflict',
  );
});

test('stopping before startup marks modules stopped and prevents restart', async () => {
  const context = createTestContext();
  const registry = createRegistry(context, [module('network', () => undefined)]);

  await registry.stop();

  assert.equal(healthOf(registry.health(), 'network')?.status, 'stopped');
  await assert.rejects(
    registry.start(),
    (error: { code?: string }) => error.code === 'conflict',
  );
});

test('health events announce every transition', async () => {
  const context = createTestContext();
  const statuses: string[] = [];
  context.events.on('core.module.health', (event) => {
    statuses.push(`${event.moduleId}:${event.health.status}`);
  });
  const registry = createRegistry(context, [module('network', () => undefined)]);

  await registry.start();
  await registry.stop();

  assert.deepEqual(statuses, [
    'network:registered',
    'network:starting',
    'network:ready',
    'network:stopped',
  ]);
});
