import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockMessengerApi } from '#mocks/messenger.ts';
import { privateConversationId, groupConversationId } from '#contracts/messaging.ts';
import type { FileSource } from '#contracts/files.ts';

const file: FileSource = {
  name: 'notes.txt',
  size: 5,
  mimeType: 'text/plain',
  chunks: async function* () {
    yield new TextEncoder().encode('hello');
  },
};

test('seeded mock provides peers, conversations, messages, groups and transfers', async () => {
  const api = await createMockMessengerApi();

  assert.equal((await api.getIdentity()).displayName, 'You');
  assert.equal(api.listPeers().length, 3);
  assert.equal(api.listPeers().at(-1)?.availability, 'offline');

  const conversations = await api.listConversations();
  assert.equal(conversations.length, 2);
  assert.ok(
    conversations.some((item) => item.id === privateConversationId('peer_aisha')),
  );
  assert.ok(
    conversations.some((item) => item.id === groupConversationId('group_local_crew')),
  );

  const messages = await api.listMessages(privateConversationId('peer_aisha'));
  assert.deepEqual(
    messages.map((item) => item.createdAt),
    [...messages.map((item) => item.createdAt)].sort((a, b) => a - b),
  );
  assert.equal(messages.length, 3);
  assert.equal((await api.listGroups()).length, 1);
  assert.equal((await api.listTransfers()).length, 1);
});

test('sending a message appends it, updates the conversation and emits an event', async () => {
  const api = await createMockMessengerApi();
  const conversationId = privateConversationId('peer_aisha');
  const events: string[] = [];
  api.events.on('messaging.conversation.updated', (conversation) => {
    events.push(conversation.id);
  });

  const message = await api.sendMessage(conversationId, '  Hello Aisha  ');

  assert.equal(message.body, 'Hello Aisha');
  assert.equal(message.status, 'sent');
  assert.equal(message.conversationId, conversationId);
  assert.deepEqual(events, [conversationId]);
  const stored = await api.listMessages(conversationId);
  assert.equal(stored.at(-1)?.id, message.id);
  const conversation = (await api.listConversations()).find(
    (item) => item.id === conversationId,
  );
  assert.equal(conversation?.unreadCount, 0);
  assert.equal(conversation?.lastMessagePreview, 'Hello Aisha');

  await assert.rejects(
    api.sendMessage(conversationId, '   '),
    (error: { code?: string }) => error.code === 'invalid_argument',
  );
  await assert.rejects(
    api.sendMessage('dm:unknown', 'hi'),
    (error: { code?: string }) => error.code === 'not_found',
  );
});

test('read state and retry use the shared storage contract', async () => {
  const api = await createMockMessengerApi();
  const conversationId = privateConversationId('peer_aisha');
  const messages = await api.listMessages(conversationId);
  const first = messages[0];
  assert.ok(first !== undefined);

  await api.storage.messages.updateStatus(first.id, 'failed');
  const retried = await api.retryMessage(first.id);
  assert.equal(retried.status, 'sent');

  await api.markConversationRead(conversationId);
  const conversation = (await api.listConversations()).find(
    (item) => item.id === conversationId,
  );
  assert.equal(conversation?.unreadCount, 0);
});

test('groups can be created and messaged with mock peers only', async () => {
  const api = await createMockMessengerApi();
  const self = await api.getIdentity();
  const group = await api.createGroup({
    name: '  Hack Team  ',
    memberIds: ['peer_rahul', 'peer_aisha', 'peer_rahul', self.peerId],
  });

  assert.equal(group.name, 'Hack Team');
  assert.deepEqual(group.members.map((member) => member.peerId), [
    self.peerId,
    'peer_rahul',
    'peer_aisha',
  ]);

  const message = await api.sendGroupMessage(group.id, 'hello team');
  assert.equal(message.conversationId, groupConversationId(group.id));
  const groupMessages = await api.listGroupMessages(group.id);
  assert.equal(groupMessages.at(-1)?.body, 'hello team');

  await assert.rejects(
    api.createGroup({ name: 'Bad', memberIds: ['unknown'] }),
    (error: { code?: string }) => error.code === 'not_found',
  );
});

test('file sending creates a transfer record without blocking messaging', async () => {
  const api = await createMockMessengerApi();

  const transfer = await api.sendFile('peer_aisha', file);
  assert.equal(transfer.state, 'completed');
  assert.equal(transfer.fileName, 'notes.txt');
  assert.equal(transfer.transferredBytes, 5);
  assert.equal((await api.listTransfers()).length, 2);

  const message = await api.sendMessage(privateConversationId('peer_aisha'), 'still chatting');
  assert.equal(message.body, 'still chatting');

  await assert.rejects(
    api.sendFile('unknown', file),
    (error: { code?: string }) => error.code === 'not_found',
  );
});

test('display name changes are reflected in identity and peers are unchanged', async () => {
  const api = await createMockMessengerApi();
  const before = api.listPeers().length;

  const identity = await api.updateDisplayName('Ashif');

  assert.equal(identity.displayName, 'Ashif');
  assert.equal((await api.getIdentity()).displayName, 'Ashif');
  assert.equal(api.listPeers().length, before);
});

test('mock modules run with no seeding and no real network', async () => {
  const api = await createMockMessengerApi({ seed: false });
  const health = api.getModuleHealth();

  assert.deepEqual(api.listPeers(), []);
  assert.deepEqual(await api.listConversations(), []);
  assert.equal(health.length, 6);
  assert.ok(health.every((item) => item.status === 'ready' && item.message === 'mock'));
});
