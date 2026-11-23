import type {
  AppEvents,
  EventBus,
  MessengerApi,
} from '#contracts/index.ts';
import type {
  ChatMessage,
  Conversation,
  MessageQuery,
} from '#contracts/messaging.ts';
import type { CreateGroupInput, GroupInfo } from '#contracts/groups.ts';
import type { FileSource, FileTransferRecord } from '#contracts/files.ts';
import type { ModuleHealthReport } from '#contracts/lifecycle.ts';
import type { PeerIdentity, IdentityService } from '#contracts/identity.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import type { IdGenerator } from '#contracts/ids.ts';
import type { ConversationId, GroupId, MessageId, PeerId } from '#types/ids.ts';
import { AppError } from '#core/errors.ts';
import { TypedEventBus } from '#core/events.ts';
import { createIdentityService } from '#core/identity.ts';
import {
  groupConversationId,
  privateConversationId,
} from '#contracts/messaging.ts';
import { MockClock } from './clock.ts';
import { createSequentialIdGenerator } from './ids.ts';
import { InMemoryStorage } from './storage.ts';
import { MockPeerNetwork } from './network.ts';

export interface MockMessengerOptions {
  readonly clock?: MockClock;
  readonly events?: EventBus<AppEvents>;
  readonly storage?: InMemoryStorage;
  readonly network?: MockPeerNetwork;
  readonly ids?: IdGenerator;
  /** Seed demo peers, chats, a group and a transfer. Defaults to true. */
  readonly seed?: boolean;
}

function requireBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    throw new AppError('invalid_argument', 'Message body must not be empty');
  }
  return trimmed;
}

function requireGroupName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 60) {
    throw new AppError(
      'invalid_argument',
      'Group name must be between 1 and 60 characters',
    );
  }
  return trimmed;
}

/**
 * Complete UI-facing mock. It uses the real contract interfaces and in-memory
 * implementations, so the UI can be built before network, storage, messaging,
 * groups or file transfer exist. Clearly a mock: sends never leave the process.
 */
export class MockMessengerApi implements MessengerApi {
  readonly events: EventBus<AppEvents>;
  readonly storage: InMemoryStorage;
  readonly network: MockPeerNetwork;
  readonly identity: IdentityService;
  private readonly clock: MockClock;
  private readonly ids: IdGenerator;

  constructor(options: MockMessengerOptions = {}) {
    this.clock =
      options.clock ??
      new MockClock(Date.UTC(2026, 0, 1, 9, 0, 0));
    this.events =
      options.events ?? new TypedEventBus<AppEvents>();
    this.storage = options.storage ?? new InMemoryStorage();
    this.network =
      options.network ??
      new MockPeerNetwork({ clock: this.clock, events: this.events });
    this.ids = options.ids ?? createSequentialIdGenerator();
    this.identity = createIdentityService({
      store: this.storage.identity,
      ids: this.ids,
      clock: this.clock,
      events: this.events,
      defaultDisplayName: 'You',
      deviceName: 'Mock Desktop',
    });
  }

  async getIdentity(): Promise<PeerIdentity> {
    return this.identity.load();
  }

  async updateDisplayName(displayName: string): Promise<PeerIdentity> {
    return this.identity.updateProfile({ displayName });
  }

  listPeers(): readonly PeerInfo[] {
    return this.network.listPeers();
  }

  async listConversations(): Promise<readonly Conversation[]> {
    return this.storage.conversations.list();
  }

  async listMessages(
    conversationId: ConversationId,
    query?: MessageQuery,
  ): Promise<readonly ChatMessage[]> {
    return this.storage.messages.listByConversation(conversationId, query);
  }

  async sendMessage(
    conversationId: ConversationId,
    body: string,
  ): Promise<ChatMessage> {
    const text = requireBody(body);
    const conversation = await this.storage.conversations.get(conversationId);
    if (conversation === undefined) {
      throw new AppError(
        'not_found',
        `Conversation "${conversationId}" does not exist`,
      );
    }
    const self = await this.identity.load();
    const now = this.clock.now();
    const message: ChatMessage = {
      id: this.ids.newId('msg'),
      conversationId,
      senderId: self.peerId,
      senderName: self.displayName,
      body: text,
      createdAt: now,
      status: 'sent',
    };
    await this.storage.messages.save(message);
    const updated: Conversation = {
      ...conversation,
      updatedAt: now,
      lastMessagePreview: text,
      unreadCount: 0,
    };
    await this.storage.conversations.save(updated);
    this.events.emit('messaging.conversation.updated', updated);
    return message;
  }

  async retryMessage(messageId: MessageId): Promise<ChatMessage> {
    const message = await this.storage.messages.get(messageId);
    if (message === undefined) {
      throw new AppError('not_found', `Message "${messageId}" does not exist`);
    }
    await this.storage.messages.updateStatus(messageId, 'sent');
    const updated: ChatMessage = { ...message, status: 'sent' };
    this.events.emit('messaging.message.updated', updated);
    return updated;
  }

  async markConversationRead(conversationId: ConversationId): Promise<void> {
    const conversation = await this.storage.conversations.get(conversationId);
    if (conversation === undefined) {
      throw new AppError(
        'not_found',
        `Conversation "${conversationId}" does not exist`,
      );
    }
    if (conversation.unreadCount === 0) return;
    const updated: Conversation = { ...conversation, unreadCount: 0 };
    await this.storage.conversations.save(updated);
    this.events.emit('messaging.conversation.updated', updated);
  }

  async listGroups(): Promise<readonly GroupInfo[]> {
    return this.storage.groups.list();
  }

  async createGroup(input: CreateGroupInput): Promise<GroupInfo> {
    const name = requireGroupName(input.name);
    const self = await this.identity.load();
    const now = this.clock.now();
    const memberIds = [...new Set(input.memberIds)].filter(
      (peerId) => peerId !== self.peerId,
    );
    const members = memberIds.map((peerId) => {
      const peer = this.network.getPeer(peerId);
      if (peer === undefined) {
        throw new AppError('not_found', `Peer "${peerId}" is unavailable`);
      }
      return {
        peerId,
        displayName: peer.displayName,
        role: 'member' as const,
        joinedAt: now,
      };
    });
    const group: GroupInfo = {
      id: this.ids.newId('grp'),
      name,
      createdBy: self.peerId,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          peerId: self.peerId,
          displayName: self.displayName,
          role: 'owner',
          joinedAt: now,
        },
        ...members,
      ],
    };
    await this.storage.groups.save(group);
    await this.ensureGroupConversation(group);
    this.events.emit('groups.group.updated', group);
    return group;
  }

  async listGroupMessages(
    groupId: GroupId,
    query?: MessageQuery,
  ): Promise<readonly ChatMessage[]> {
    return this.storage.messages.listByConversation(
      groupConversationId(groupId),
      query,
    );
  }

  async sendGroupMessage(
    groupId: GroupId,
    body: string,
  ): Promise<ChatMessage> {
    const text = requireBody(body);
    const group = await this.storage.groups.get(groupId);
    if (group === undefined) {
      throw new AppError('not_found', `Group "${groupId}" does not exist`);
    }
    const self = await this.identity.load();
    const conversation = await this.ensureGroupConversation(group);
    const now = this.clock.now();
    const message: ChatMessage = {
      id: this.ids.newId('msg'),
      conversationId: conversation.id,
      senderId: self.peerId,
      senderName: self.displayName,
      body: text,
      createdAt: now,
      status: 'sent',
    };
    await this.storage.messages.save(message);
    const updated: Conversation = {
      ...conversation,
      updatedAt: now,
      lastMessagePreview: text,
    };
    await this.storage.conversations.save(updated);
    this.events.emit('messaging.conversation.updated', updated);
    return message;
  }

  async sendFile(
    peerId: PeerId,
    file: FileSource,
  ): Promise<FileTransferRecord> {
    if (this.network.getPeer(peerId) === undefined) {
      throw new AppError('not_found', `Peer "${peerId}" is unavailable`);
    }
    if (!Number.isFinite(file.size) || file.size < 0) {
      throw new AppError('invalid_argument', 'File size must be non-negative');
    }
    const now = this.clock.now();
    const transfer: FileTransferRecord = {
      id: this.ids.newId('xfer'),
      peerId,
      direction: 'outgoing',
      fileName: file.name,
      size: file.size,
      transferredBytes: file.size,
      state: 'completed',
      createdAt: now,
      updatedAt: now,
      completedAt: now,
      ...(file.mimeType === undefined ? {} : { mimeType: file.mimeType }),
    };
    await this.storage.transfers.save(transfer);
    this.events.emit('files.transfer.updated', transfer);
    return transfer;
  }

  async listTransfers(): Promise<readonly FileTransferRecord[]> {
    return this.storage.transfers.list();
  }

  getModuleHealth(): readonly ModuleHealthReport[] {
    const at = this.clock.now();
    return [
      'core',
      'network',
      'storage',
      'messaging',
      'groups',
      'file-transfer',
    ].map((moduleId) => ({
      moduleId,
      optional: false,
      status: 'ready' as const,
      message: 'mock',
      updatedAt: at,
    }));
  }

  /** Adds deterministic demo content so a UI has something to render. */
  async seedDemoData(): Promise<void> {
    const self = await this.identity.load();
    const start = this.clock.now();
    const aisha = this.network.addPeer({
      peerId: 'peer_aisha',
      displayName: 'Aisha',
      deviceName: 'Pixel 8',
      platform: 'android',
    });
    const rahul = this.network.addPeer({
      peerId: 'peer_rahul',
      displayName: 'Rahul',
      deviceName: 'ThinkPad',
      platform: 'linux',
    });
    this.network.addPeer({
      peerId: 'peer_sam',
      displayName: 'Sam',
      deviceName: 'MacBook Air',
      platform: 'macos',
    });
    this.network.markPeerOffline('peer_sam');

    const conversation = await this.getOrCreatePrivateConversation(
      aisha.peerId,
      aisha.displayName,
    );
    const first: ChatMessage = {
      id: this.ids.newId('msg'),
      conversationId: conversation.id,
      senderId: aisha.peerId,
      senderName: aisha.displayName,
      body: 'Hey! Are you on the same Wi-Fi?',
      createdAt: start,
      status: 'received',
    };
    const second: ChatMessage = {
      id: this.ids.newId('msg'),
      conversationId: conversation.id,
      senderId: self.peerId,
      senderName: self.displayName,
      body: 'Yes — found you nearby.',
      createdAt: start + 60_000,
      status: 'delivered',
    };
    const third: ChatMessage = {
      id: this.ids.newId('msg'),
      conversationId: conversation.id,
      senderId: aisha.peerId,
      senderName: aisha.displayName,
      body: 'Perfect. Group chat and files too?',
      createdAt: start + 120_000,
      status: 'received',
    };
    for (const message of [first, second, third]) {
      await this.storage.messages.save(message);
    }
    await this.storage.conversations.save({
      ...conversation,
      updatedAt: third.createdAt,
      unreadCount: 1,
      lastMessagePreview: third.body,
    });

    const group: GroupInfo = {
      id: 'group_local_crew',
      name: 'Local Crew',
      createdBy: self.peerId,
      createdAt: start + 180_000,
      updatedAt: start + 180_000,
      members: [
        {
          peerId: self.peerId,
          displayName: self.displayName,
          role: 'owner',
          joinedAt: start + 180_000,
        },
        {
          peerId: aisha.peerId,
          displayName: aisha.displayName,
          role: 'member',
          joinedAt: start + 180_000,
        },
        {
          peerId: rahul.peerId,
          displayName: rahul.displayName,
          role: 'member',
          joinedAt: start + 180_000,
        },
      ],
    };
    await this.storage.groups.save(group);
    const groupConversation = await this.ensureGroupConversation(group);
    const groupMessage: ChatMessage = {
      id: this.ids.newId('msg'),
      conversationId: groupConversation.id,
      senderId: rahul.peerId,
      senderName: rahul.displayName,
      body: 'Group chat works offline too.',
      createdAt: start + 240_000,
      status: 'received',
    };
    await this.storage.messages.save(groupMessage);
    await this.storage.conversations.save({
      ...groupConversation,
      updatedAt: groupMessage.createdAt,
      unreadCount: 1,
      lastMessagePreview: groupMessage.body,
    });

    const transfer: FileTransferRecord = {
      id: 'xfer_demo',
      peerId: aisha.peerId,
      direction: 'incoming',
      fileName: 'sunset.jpg',
      size: 248_000,
      mimeType: 'image/jpeg',
      transferredBytes: 248_000,
      state: 'completed',
      createdAt: start + 300_000,
      updatedAt: start + 300_000,
      completedAt: start + 300_000,
      localUri: 'mock://received/sunset.jpg',
    };
    await this.storage.transfers.save(transfer);
    this.clock.set(start + 360_000);
  }

  private async getOrCreatePrivateConversation(
    peerId: PeerId,
    peerName: string,
  ): Promise<Conversation> {
    const id = privateConversationId(peerId);
    const existing = await this.storage.conversations.get(id);
    if (existing !== undefined) return existing;
    const now = this.clock.now();
    const conversation: Conversation = {
      id,
      kind: 'private',
      peerId,
      title: peerName,
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
    };
    await this.storage.conversations.save(conversation);
    this.events.emit('messaging.conversation.updated', conversation);
    return conversation;
  }

  private async ensureGroupConversation(
    group: GroupInfo,
  ): Promise<Conversation> {
    const id = groupConversationId(group.id);
    const existing = await this.storage.conversations.get(id);
    if (existing !== undefined) return existing;
    const now = this.clock.now();
    const conversation: Conversation = {
      id,
      kind: 'group',
      groupId: group.id,
      title: group.name,
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
    };
    await this.storage.conversations.save(conversation);
    this.events.emit('messaging.conversation.updated', conversation);
    return conversation;
  }
}

export async function createMockMessengerApi(
  options: MockMessengerOptions = {},
): Promise<MockMessengerApi> {
  const api = new MockMessengerApi(options);
  if (options.seed !== false) await api.seedDemoData();
  return api;
}
