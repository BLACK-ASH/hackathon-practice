import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ModuleContext } from '#contracts/lifecycle.ts';
import type { MessageStatus } from '#contracts/messaging.ts';
import { CHANNELS } from '#contracts/network.ts';
import { createTestContext, waitForEvent } from '#mocks/index.ts';
import { MessagingEngine } from '../modules/messaging/src/index.ts';
import {
  encodePrivateMessage,
  encodeReceipt,
} from '../modules/messaging/src/wire.ts';

function tick(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

async function setup() {
  const ctx = createTestContext();
  const engine = new MessagingEngine({
    network: ctx.network,
    storage: ctx.storage,
    identity: ctx.identity,
    events: ctx.events,
    ids: ctx.ids,
    clock: ctx.clock,
    logger: ctx.logger,
  });
  const context: ModuleContext = {
    moduleId: 'messaging',
    config: ctx.config,
    logger: ctx.logger,
    clock: ctx.clock,
    events: ctx.events,
    signal: new AbortController().signal,
    report: () => undefined,
    onCleanup: () => undefined,
  };
  await engine.initialize(context);
  ctx.network.addPeer({ peerId: 'peer_b', displayName: 'Bea' });
  const conversation = await engine.getOrCreatePrivateConversation(
    'peer_b',
    'Bea',
  );
  return { ...ctx, engine, conversation };
}

function incoming(id: string, body: string, createdAt: number): Uint8Array {
  return encodePrivateMessage({
    id,
    conversationId: 'dm:peer_b',
    senderId: 'peer_b',
    senderName: 'Bea',
    body,
    createdAt,
    status: 'received',
  });
}

test('send stores history, updates the conversation and supports retry after failure', async () => {
  const { engine, conversation, network, events } = await setup();
  const updates: MessageStatus[] = [];
  events.on('messaging.message.updated', (message) => {
    updates.push(message.status);
  });

  const sent = await engine.sendMessage(conversation.id, '  hello Bea  ');
  assert.equal(sent.body, 'hello Bea');
  assert.equal(sent.status, 'sent');

  network.failNextSends(1);
  const failed = await engine.sendMessage(conversation.id, 'retry me');
  assert.equal(failed.status, 'failed');
  assert.deepEqual(updates.slice(0, 4), ['pending', 'sent', 'pending', 'failed']);

  const retried = await engine.retryMessage(failed.id);
  assert.equal(retried.status, 'sent');
  assert.equal(retried.id, failed.id);

  const history = await engine.listMessages(conversation.id);
  assert.deepEqual(history.map((message) => message.id), [sent.id, retried.id]);
  const stored = await engine.getConversation(conversation.id);
  assert.equal(stored?.lastMessagePreview, 'retry me');
  assert.equal(stored?.unreadCount, 0);
});

test('incoming messages are ordered, deduplicated and counted once', async () => {
  const { engine, events, network } = await setup();

  const later = waitForEvent(
    events,
    'messaging.message.received',
    (message) => message.id === 'msg_later',
  );
  await network.deliverFrom(
    'peer_b',
    CHANNELS.messaging,
    incoming('msg_later', 'later', 20),
  );
  await later;

  const earlier = waitForEvent(
    events,
    'messaging.message.received',
    (message) => message.id === 'msg_earlier',
  );
  await network.deliverFrom(
    'peer_b',
    CHANNELS.messaging,
    incoming('msg_earlier', 'earlier', 10),
  );
  await earlier;
  await network.deliverFrom(
    'peer_b',
    CHANNELS.messaging,
    incoming('msg_earlier', 'earlier', 10),
  );
  await tick();

  const messages = await engine.listMessages('dm:peer_b');
  assert.deepEqual(
    messages.map((message) => message.id),
    ['msg_earlier', 'msg_later'],
  );
  assert.deepEqual(
    messages.map((message) => message.status),
    ['received', 'received'],
  );
  const conversation = await engine.getConversation('dm:peer_b');
  assert.equal(conversation?.unreadCount, 2);
});

test('a receipt marks the sender message delivered', async () => {
  const { conversation, engine, events, network } = await setup();
  const sent = await engine.sendMessage(conversation.id, 'delivered?');
  const delivered = waitForEvent(
    events,
    'messaging.message.updated',
    (message) => message.id === sent.id && message.status === 'delivered',
  );

  await network.deliverFrom(
    'peer_b',
    CHANNELS.messaging,
    encodeReceipt(sent.id),
  );
  await delivered;

  const stored = await engine.listMessages(conversation.id);
  assert.equal(stored[0]?.status, 'delivered');
});

test('invalid input, malformed payloads and post-shutdown delivery are ignored safely', async () => {
  const { conversation, engine, network, storage } = await setup();

  await assert.rejects(
    engine.sendMessage(conversation.id, '   '),
    (error: { code?: string }) => error.code === 'invalid_argument',
  );
  await assert.rejects(
    engine.sendMessage('dm:unknown', 'hi'),
    (error: { code?: string }) => error.code === 'not_found',
  );

  await storage.conversations.save({
    id: 'group:g1',
    kind: 'group',
    groupId: 'g1',
    title: 'Group',
    createdAt: 0,
    updatedAt: 0,
    unreadCount: 0,
  });
  await assert.rejects(
    engine.sendMessage('group:g1', 'hi'),
    (error: { code?: string }) => error.code === 'invalid_argument',
  );

  await network.deliverFrom(
    'peer_b',
    CHANNELS.messaging,
    new TextEncoder().encode('not json'),
  );
  await engine.shutdown();
  await network.deliverFrom(
    'peer_b',
    CHANNELS.messaging,
    incoming('msg_after_shutdown', 'ignored', 30),
  );
  await tick();

  assert.deepEqual(await engine.listMessages(conversation.id), []);
});
