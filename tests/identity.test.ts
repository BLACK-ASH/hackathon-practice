import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityService, normalizeDisplayName } from '#core/identity.ts';
import type { AppEvents } from '#contracts/events.ts';
import { createTestContext } from '#mocks/test-context.ts';

test('identity is created once, persisted and announced', async () => {
  const context = createTestContext();
  const announced: string[] = [];
  context.events.on('identity.changed', (identity) => {
    announced.push(identity.peerId);
  });

  const identity = await context.identity.load();

  assert.equal(identity.peerId, 'peer_1');
  assert.equal(identity.displayName, 'Test User');
  assert.equal(identity.deviceName, 'Test Device');
  assert.deepEqual(announced, ['peer_1']);
  assert.deepEqual(await context.storage.identity.get(), identity);
});

test('loading an existing identity does not create a new peer ID', async () => {
  const context = createTestContext();
  const first = await context.identity.load();

  const second = createIdentityService({
    store: context.storage.identity,
    ids: context.ids,
    clock: context.clock,
    events: context.events,
    defaultDisplayName: 'Different Default',
  });
  const loaded = await second.load();

  assert.equal(loaded.peerId, first.peerId);
  assert.equal(loaded.displayName, 'Test User');
});

test('updating the profile trims the name, persists it and emits an event', async () => {
  const context = createTestContext();
  await context.identity.load();
  const updates: AppEvents['identity.changed'][] = [];
  context.events.on('identity.changed', (identity) => updates.push(identity));

  const updated = await context.identity.updateProfile({
    displayName: '  Ashif  ',
    avatarUrl: ' https://example.test/a.png ',
  });

  assert.equal(updated.displayName, 'Ashif');
  assert.equal(updated.avatarUrl, 'https://example.test/a.png');
  assert.deepEqual(await context.storage.identity.get(), updated);
  assert.equal(updates.length, 1);

  const cleared = await context.identity.updateProfile({ avatarUrl: '' });
  assert.equal(cleared.avatarUrl, undefined);
  assert.equal(cleared.displayName, 'Ashif');
});

test('invalid display names are rejected', async () => {
  const context = createTestContext();
  await context.identity.load();

  await assert.rejects(
    context.identity.updateProfile({ displayName: '   ' }),
    (error: { code?: string }) => error.code === 'invalid_argument',
  );
  await assert.rejects(
    context.identity.updateProfile({ displayName: 'x'.repeat(41) }),
    (error: { code?: string }) => error.code === 'invalid_argument',
  );
  await assert.rejects(
    context.identity.updateProfile({ displayName: 'bad\nname' }),
    (error: { code?: string }) => error.code === 'invalid_argument',
  );
});

test('normalizeDisplayName keeps normal names intact', () => {
  assert.equal(normalizeDisplayName('  Aisha  '), 'Aisha');
  assert.equal(normalizeDisplayName('Änne 47'), 'Änne 47');
});
