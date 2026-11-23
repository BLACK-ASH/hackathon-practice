import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryStorage } from '#mocks/storage.ts';
import { AppError } from '#core/errors.ts';
import type { ChatMessage, Conversation } from '#contracts/messaging.ts';
import type { GroupInfo } from '#contracts/groups.ts';
import type { FileTransferRecord } from '#contracts/files.ts';

function message(id: string, createdAt: number, conversationId = 'dm:p1'): ChatMessage {
  return {
    id,
    conversationId,
    senderId: 'p1',
    senderName: 'Aisha',
    body: id,
    createdAt,
    status: 'received',
  };
}

function conversation(id: string, updatedAt: number): Conversation {
  return {
    id,
    kind: 'private',
    title: id,
    createdAt: 0,
    updatedAt,
    unreadCount: 0,
  };
}

test('identity storage round-trips copies instead of live objects', async () => {
  const storage = new InMemoryStorage();
  await storage.identity.save({
    peerId: 'peer_1',
    displayName: 'Ashif',
  });

  const loaded = await storage.identity.get();
  assert.equal(loaded?.displayName, 'Ashif');
  if (loaded !== undefined) {
    (loaded as { displayName: string }).displayName = 'Changed';
  }

  assert.equal((await storage.identity.get())?.displayName, 'Ashif');
});

test('settings support generic values and deletion', async () => {
  const storage = new InMemoryStorage();
  await storage.settings.set('ui', { theme: 'dark', density: 2 });

  const loaded = await storage.settings.get<{ theme: string; density: number }>('ui');
  assert.deepEqual(loaded, { theme: 'dark', density: 2 });
  if (loaded !== undefined) loaded.theme = 'light';
  assert.equal((await storage.settings.get<{ theme: string }>('ui'))?.theme, 'dark');

  await storage.settings.delete('ui');
  assert.equal(await storage.settings.get('ui'), undefined);
});

test('conversations are listed by most recently updated', async () => {
  const storage = new InMemoryStorage();
  await storage.conversations.save(conversation('a', 10));
  await storage.conversations.save(conversation('b', 30));
  await storage.conversations.save(conversation('c', 20));

  assert.deepEqual(
    (await storage.conversations.list()).map((item) => item.id),
    ['b', 'c', 'a'],
  );
});

test('messages are ordered, filterable and limit from the newest end', async () => {
  const storage = new InMemoryStorage();
  await storage.messages.save(message('m2', 20));
  await storage.messages.save(message('m1', 10));
  await storage.messages.save(message('m3', 30));
  await storage.messages.save(message('other', 25, 'dm:p2'));

  assert.deepEqual(
    (await storage.messages.listByConversation('dm:p1')).map((item) => item.id),
    ['m1', 'm2', 'm3'],
  );
  assert.deepEqual(
    (await storage.messages.listByConversation('dm:p1', { before: 30, limit: 1 })).map(
      (item) => item.id,
    ),
    ['m2'],
  );
  assert.deepEqual(
    (await storage.messages.listByConversation('dm:p1', { after: 10, limit: 1 })).map(
      (item) => item.id,
    ),
    ['m3'],
  );
  assert.deepEqual(
    await storage.messages.listByConversation('dm:p1', { limit: 0 }),
    [],
  );
});

test('message status updates are persisted and missing messages fail', async () => {
  const storage = new InMemoryStorage();
  await storage.messages.save(message('m1', 10));

  await storage.messages.updateStatus('m1', 'delivered');
  assert.equal((await storage.messages.get('m1'))?.status, 'delivered');
  await assert.rejects(
    storage.messages.updateStatus('missing', 'sent'),
    (error: { code?: string }) => error.code === 'not_found',
  );
});

test('groups and transfers persist and list newest first', async () => {
  const storage = new InMemoryStorage();
  const group: GroupInfo = {
    id: 'g1',
    name: 'Crew',
    createdBy: 'p1',
    createdAt: 1,
    updatedAt: 2,
    members: [],
  };
  const transfer: FileTransferRecord = {
    id: 't1',
    peerId: 'p1',
    direction: 'incoming',
    fileName: 'a.txt',
    size: 10,
    transferredBytes: 10,
    state: 'completed',
    createdAt: 1,
    updatedAt: 2,
  };
  await storage.groups.save(group);
  await storage.transfers.save(transfer);

  assert.equal((await storage.groups.get('g1'))?.name, 'Crew');
  assert.equal((await storage.groups.list()).length, 1);
  assert.equal((await storage.transfers.get('t1'))?.fileName, 'a.txt');
  assert.equal((await storage.transfers.list()).length, 1);

  await storage.groups.delete('g1');
  assert.equal(await storage.groups.get('g1'), undefined);
});

test('failure injection fails one operation and then recovers', async () => {
  const storage = new InMemoryStorage();
  const failure = new AppError('io', 'disk full');
  storage.failNext('messages.save', failure);

  await assert.rejects(storage.messages.save(message('m1', 1)), /disk full/);
  await storage.messages.save(message('m1', 1));
  assert.equal((await storage.messages.get('m1'))?.id, 'm1');
});

test('clear removes all stored data', async () => {
  const storage = new InMemoryStorage();
  await storage.identity.save({ peerId: 'p1', displayName: 'A' });
  await storage.messages.save(message('m1', 1));

  storage.clear();

  assert.equal(await storage.identity.get(), undefined);
  assert.deepEqual(await storage.messages.listByConversation('dm:p1'), []);
});
