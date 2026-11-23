import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '#core/config.ts';

test('loadConfig provides usable defaults without environment input', () => {
  const { config, issues } = loadConfig({ env: {} });

  assert.deepEqual(issues, []);
  assert.equal(config.appName, 'P2P LAN Messenger');
  assert.equal(config.environment, 'production');
  assert.equal(config.logLevel, 'info');
  assert.equal(config.dataDir, '.lan-messenger');
});

test('loadConfig reads supported environment variables', () => {
  const { config, issues } = loadConfig({
    env: {
      APP_ENV: 'test',
      APP_LOG_LEVEL: 'debug',
      APP_DATA_DIR: '/tmp/messenger',
      APP_NAME: 'LAN Chat',
      APP_VERSION: '2.1.0',
    },
  });

  assert.deepEqual(issues, []);
  assert.equal(config.environment, 'test');
  assert.equal(config.logLevel, 'debug');
  assert.equal(config.dataDir, '/tmp/messenger');
  assert.equal(config.appName, 'LAN Chat');
  assert.equal(config.appVersion, '2.1.0');
});

test('invalid environment values fall back and are reported', () => {
  const { config, issues } = loadConfig({
    env: { APP_ENV: 'staging', APP_LOG_LEVEL: 'verbose' },
  });

  assert.equal(config.environment, 'production');
  assert.equal(config.logLevel, 'info');
  assert.deepEqual(
    issues.map((issue) => issue.key),
    ['environment', 'logLevel'],
  );
});

test('defaults can be overridden and are still overridden by the environment', () => {
  const { config } = loadConfig({
    env: { APP_LOG_LEVEL: 'warn' },
    defaults: {
      appName: 'Test App',
      environment: 'development',
      logLevel: 'debug',
      dataDir: '/tmp/test-data',
    },
  });

  assert.equal(config.appName, 'Test App');
  assert.equal(config.environment, 'development');
  assert.equal(config.dataDir, '/tmp/test-data');
  assert.equal(config.logLevel, 'warn');
});

test('whitespace-only environment values are ignored', () => {
  const { config, issues } = loadConfig({
    env: { APP_NAME: '   ', APP_DATA_DIR: '  ' },
  });

  assert.deepEqual(issues, []);
  assert.equal(config.appName, 'P2P LAN Messenger');
  assert.equal(config.dataDir, '.lan-messenger');
});
