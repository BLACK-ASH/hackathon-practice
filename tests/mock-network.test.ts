import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockPeerNetwork } from '#mocks/network.ts';
import { CHANNELS } from '#contracts/network.ts';
import type { AppEvents } from '#contracts/events.ts';
import { createTestContext } from '#mocks/test-context.ts';

test('discovery adds peers once and announces updates', () => {
  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  const discovered: string[] = [];
  const updated: string[] = [];
  context.events.on('network.peer.discovered', (peer) => {
    discovered.push(peer.peerId);
  });
  context.events.on('network.peer.updated', (peer) => {
    updated.push(peer.displayName);
  });

  network.addPeer({ peerId: 'p1', displayName: 'Aisha' });
  network.addPeer({ peerId: 'p1', displayName: 'Aisha B.' });

  assert.deepEqual(discovered, ['p1']);
  assert.deepEqual(updated, ['Aisha B.']);
  assert.equal(network.listPeers().length, 1);
  assert.equal(network.getPeer('p1')?.displayName, 'Aisha B.');
});

test('connect moves through connecting to connected and announces state', async () => {
  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  const states: string[] = [];
  context.events.on('network.connection.changed', (connection) => {
    states.push(`${connection.peerId}:${connection.state}`);
  });
  network.addPeer({ peerId: 'p1', displayName: 'Aisha' });

  const connection = await network.connect('p1');

  assert.equal(connection.state, 'connected');
  assert.equal(network.getConnection('p1')?.state, 'connected');
  assert.equal(network.getPeer('p1')?.connectionState, 'connected');
  assert.deepEqual(states, ['p1:connecting', 'p1:connected']);
});

test('reconnecting state can be simulated and recovered', async () => {
  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  network.addPeer({ peerId: 'p1', displayName: 'Aisha' });

  network.markReconnecting('p1');
  assert.equal(network.getConnection('p1')?.state, 'reconnecting');
  assert.equal(network.getPeer('p1')?.connectionState, 'reconnecting');

  const connection = await network.connect('p1');
  assert.equal(connection.state, 'connected');
});

test('send auto-connects by default and honours failure injection', async () => {  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  network.addPeer({ peerId: 'p1', displayName: 'Aisha' });

  await network.send('p1', CHANNELS.messaging, new Uint8Array([1]));
  assert.equal(network.getConnection('p1')?.state, 'connected');

  network.failNextSends(1);
  await assert.rejects(
    network.send('p1', CHANNELS.messaging, new Uint8Array([2])),
    (error: { code?: string }) => error.code === 'unavailable',
  );
  await network.send('p1', CHANNELS.messaging, new Uint8Array([3]));
});

test('offline peers reject connect and send until they are reachable again', async () => {
  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  const lost: string[] = [];
  context.events.on('network.peer.lost', (event) => lost.push(event.peerId));
  network.addPeer({ peerId: 'p1', displayName: 'Aisha' });
  network.markPeerOffline('p1');

  await assert.rejects(network.connect('p1'), (error: { code?: string }) => error.code === 'unavailable');
  await assert.rejects(
    network.send('p1', CHANNELS.messaging, new Uint8Array()),
    (error: { code?: string }) => error.code === 'unavailable',
  );
  assert.equal(network.getPeer('p1')?.availability, 'offline');
  assert.deepEqual(lost, ['p1']);
});

test('forgetPeer removes the peer and announces loss', () => {
  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  const lost: string[] = [];
  context.events.on('network.peer.lost', (event) => lost.push(event.peerId));
  network.addPeer({ peerId: 'p1', displayName: 'Aisha' });

  network.forgetPeer('p1');

  assert.equal(network.getPeer('p1'), undefined);
  assert.deepEqual(network.listPeers(), []);
  assert.deepEqual(lost, ['p1']);
});

test('incoming messages reach subscribers and duplicates can be simulated', async () => {
  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  const messages: string[] = [];
  const subscription = network.onMessage(CHANNELS.messaging, (message) => {
    messages.push(`${message.from}:${new TextDecoder().decode(message.payload)}`);
  });

  await network.deliverFrom('p1', CHANNELS.messaging, new TextEncoder().encode('hi'));
  await network.deliverDuplicate('p1', CHANNELS.messaging, new TextEncoder().encode('hi'), 2);
  subscription.unsubscribe();
  await network.deliverFrom('p1', CHANNELS.messaging, new TextEncoder().encode('ignored'));

  assert.deepEqual(messages, ['p1:hi', 'p1:hi', 'p1:hi']);
  assert.equal(network.getPeer('p1')?.displayName, 'p1');
});

test('a failing message handler does not block other handlers', async () => {
  const context = createTestContext();
  const network = context.network;
  const received: string[] = [];
  network.onMessage(CHANNELS.groups, () => {
    throw new Error('bad handler');
  });
  network.onMessage(CHANNELS.groups, (message) => {
    received.push(message.from);
  });

  await network.deliverFrom('p1', CHANNELS.groups, new Uint8Array());

  assert.deepEqual(received, ['p1']);
  assert.ok(
    context.logs.some((record) => record.message === 'Mock peer message handler failed'),
  );
});

test('message subscribers are isolated per channel', async () => {
  const network = new MockPeerNetwork();
  const messaging: string[] = [];
  const files: string[] = [];
  network.onMessage(CHANNELS.messaging, (message) => {
    messaging.push(message.channel);
  });
  network.onMessage(CHANNELS.files, (message) => {
    files.push(message.channel);
  });

  await network.deliverFrom('p1', CHANNELS.messaging, new Uint8Array());

  assert.deepEqual(messaging, ['messaging']);
  assert.deepEqual(files, []);
});

test('connection and peer events carry the same state', async () => {
  const context = createTestContext();
  const network = new MockPeerNetwork({ clock: context.clock, events: context.events });
  const events: AppEvents['network.peer.updated'][] = [];
  context.events.on('network.peer.updated', (peer) => events.push(peer));
  network.addPeer({ peerId: 'p1', displayName: 'Aisha' });

  await network.connect('p1');

  assert.equal(events.at(-1)?.connectionState, 'connected');
});
