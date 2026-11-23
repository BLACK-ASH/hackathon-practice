import type { AppEvents, EventBus, Subscription } from '#contracts/events.ts';
import type { IdGenerator } from '#contracts/ids.ts';
import type { IdentityService } from '#contracts/identity.ts';
import type { AppModule, ModuleContext } from '#contracts/lifecycle.ts';
import type { Logger } from '#contracts/logging.ts';
import type {
  ChatMessage,
  Conversation,
  MessageQuery,
  MessagingService,
} from '#contracts/messaging.ts';
import { privateConversationId } from '#contracts/messaging.ts';
import { CHANNELS, type PeerNetwork } from '#contracts/network.ts';
import type { StorageService } from '#contracts/storage.ts';
import type { ConversationId, MessageId, PeerId } from '#types/ids.ts';
import type { Clock } from '#types/time.ts';
import { AppError } from '#core/errors.ts';
import { createLogger } from '#core/logging.ts';
import {
  decodePrivateWire,
  encodePrivateMessage,
  encodeReceipt,
  type PrivateMessageWire,
  type ReceiptWire,
} from './wire.ts';

type PrivateConversation = Conversation & { readonly peerId: PeerId };

export interface MessagingEngineDeps {
  readonly network: PeerNetwork;
  readonly storage: StorageService;
  readonly identity: IdentityService;
  readonly events: EventBus<AppEvents>;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly logger?: Logger;
}

function requireBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    throw new AppError('invalid_argument', 'Message body must not be empty');
  }
  return trimmed;
}

function requireName(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new AppError('invalid_argument', `${label} must not be empty`);
  }
  return trimmed;
}

/**
 * Independent private-messaging module. It owns serialization, deduplication
 * and conversation state; network adapters and durable storage stay injected.
 */
export class MessagingEngine implements MessagingService, AppModule {
  readonly id = 'messaging';
  readonly name = 'Private Messaging';
  readonly events: EventBus<AppEvents>;

  private readonly network: PeerNetwork;
  private readonly storage: StorageService;
  private readonly identity: IdentityService;
  private readonly ids: IdGenerator;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private subscription?: Subscription;
  private context?: ModuleContext;

  constructor(deps: MessagingEngineDeps) {
    this.network = deps.network;
    this.storage = deps.storage;
    this.identity = deps.identity;
    this.events = deps.events;
    this.ids = deps.ids;
    this.clock = deps.clock;
    this.logger =
      deps.logger?.child('messaging') ??
      createLogger({ level: 'error', scope: 'messaging', sink: () => undefined });
  }

  async initialize(context: ModuleContext): Promise<void> {
    if (this.subscription !== undefined) return;
    this.context = context;
    this.subscription = this.network.onMessage(
      CHANNELS.messaging,
      (message) => {
        void this.handleIncoming(message.from, message.payload);
      },
    );
  }

  async shutdown(): Promise<void> {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    this.context = undefined;
  }

  listConversations(): Promise<readonly Conversation[]> {
    return this.storage.conversations.list();
  }

  getConversation(id: ConversationId): Promise<Conversation | undefined> {
    return this.storage.conversations.get(id);
  }

  async getOrCreatePrivateConversation(
    peerId: PeerId,
    peerName: string,
  ): Promise<Conversation> {
    const id = privateConversationId(requireName(peerId, 'Peer ID'));
    const name = requireName(peerName, 'Peer name');
    const existing = await this.storage.conversations.get(id);
    if (existing === undefined) {
      const now = this.clock.now();
      const conversation: Conversation = {
        id,
        kind: 'private',
        peerId,
        title: name,
        createdAt: now,
        updatedAt: now,
        unreadCount: 0,
      };
      await this.storage.conversations.save(conversation);
      this.events.emit('messaging.conversation.updated', conversation);
      return conversation;
    }
    if (existing.title !== name) {
      const updated: Conversation = { ...existing, title: name };
      await this.storage.conversations.save(updated);
      this.events.emit('messaging.conversation.updated', updated);
      return updated;
    }
    return existing;
  }

  listMessages(
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
    const conversation = await this.requirePrivateConversation(conversationId);
    const self = await this.identity.load();
    const now = this.clock.now();
    const message: ChatMessage = {
      id: this.ids.newId('msg'),
      conversationId,
      senderId: self.peerId,
      senderName: self.displayName,
      body: text,
      createdAt: now,
      status: 'pending',
    };

    await this.storage.messages.save(message);
    this.events.emit('messaging.message.updated', message);
    await this.touchConversation(conversation, text, now);
    return this.dispatch(message);
  }

  async retryMessage(messageId: MessageId): Promise<ChatMessage> {
    const current = await this.storage.messages.get(messageId);
    if (current === undefined) {
      throw new AppError('not_found', `Message "${messageId}" does not exist`);
    }
    const self = await this.identity.load();
    if (current.senderId !== self.peerId) {
      throw new AppError(
        'invalid_argument',
        'Only messages sent by this device can be retried',
      );
    }
    await this.requirePrivateConversation(current.conversationId);
    await this.setStatus(messageId, 'pending');
    return this.dispatch(current);
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

  private async requirePrivateConversation(
    id: ConversationId,
  ): Promise<PrivateConversation> {
    const conversation = await this.storage.conversations.get(id);
    if (conversation === undefined) {
      throw new AppError('not_found', `Conversation "${id}" does not exist`);
    }
    if (conversation.kind !== 'private' || conversation.peerId === undefined) {
      throw new AppError(
        'invalid_argument',
        'The messaging engine only handles private conversations',
      );
    }
    return { ...conversation, peerId: conversation.peerId };
  }

  private async touchConversation(
    conversation: Conversation,
    preview: string,
    at: number,
  ): Promise<void> {
    const updated: Conversation = {
      ...conversation,
      updatedAt: Math.max(conversation.updatedAt, at),
      lastMessagePreview: preview,
      unreadCount: 0,
    };
    await this.storage.conversations.save(updated);
    this.events.emit('messaging.conversation.updated', updated);
  }

  private async setStatus(
    id: MessageId,
    status: ChatMessage['status'],
  ): Promise<ChatMessage> {
    const current = await this.storage.messages.get(id);
    if (current === undefined) {
      throw new AppError('not_found', `Message "${id}" does not exist`);
    }
    if (current.status === status) return current;
    await this.storage.messages.updateStatus(id, status);
    const updated: ChatMessage = { ...current, status };
    this.events.emit('messaging.message.updated', updated);
    return updated;
  }

  private async dispatch(message: ChatMessage): Promise<ChatMessage> {
    const conversation = await this.requirePrivateConversation(
      message.conversationId,
    );
    try {
      await this.network.send(
        conversation.peerId,
        CHANNELS.messaging,
        encodePrivateMessage(message),
      );
      return await this.setStatus(message.id, 'sent');
    } catch (error) {
      const safe = AppError.from(
        error,
        'unavailable',
        'Message could not be delivered',
      );
      this.logger.warn('Private message send failed', {
        messageId: message.id,
        peerId: conversation.peerId,
        code: safe.code,
      });
      return await this.setStatus(message.id, 'failed');
    }
  }

  private async handleIncoming(
    from: PeerId,
    payload: Uint8Array,
  ): Promise<void> {
    const wire = decodePrivateWire(payload);
    if (wire === undefined) {
      this.logger.warn('Ignored malformed private message', { from });
      return;
    }
    try {
      if (wire.kind === 'receipt') {
        await this.handleReceipt(from, wire);
      } else {
        await this.handlePrivateMessage(from, wire);
      }
    } catch (error) {
      const safe = AppError.from(
        error,
        'internal',
        'Could not process an incoming message',
      );
      this.logger.error('Failed to process private message', {
        from,
        code: safe.code,
      });
      this.context?.report('degraded', 'Could not process an incoming message');
    }
  }

  private async handlePrivateMessage(
    from: PeerId,
    wire: PrivateMessageWire,
  ): Promise<void> {
    if (wire.senderId !== from) return;
    if (wire.conversationId !== privateConversationId(from)) return;

    const existing = await this.storage.messages.get(wire.id);
    if (existing !== undefined) {
      await this.sendReceipt(from, wire.id);
      return;
    }

    const message: ChatMessage = {
      id: wire.id,
      conversationId: wire.conversationId,
      senderId: from,
      senderName: wire.senderName,
      body: wire.body,
      createdAt: wire.createdAt,
      status: 'received',
    };
    await this.storage.messages.save(message);

    const current = await this.storage.conversations.get(wire.conversationId);
    const updated: Conversation = {
      ...(current ?? {
        id: wire.conversationId,
        kind: 'private',
        peerId: from,
        createdAt: wire.createdAt,
        unreadCount: 0,
      }),
      title: wire.senderName,
      updatedAt: Math.max(current?.updatedAt ?? 0, wire.createdAt),
      unreadCount: (current?.unreadCount ?? 0) + 1,
      lastMessagePreview: wire.body,
    };
    await this.storage.conversations.save(updated);
    this.events.emit('messaging.message.received', message);
    this.events.emit('messaging.conversation.updated', updated);
    await this.sendReceipt(from, wire.id);
  }

  private async handleReceipt(from: PeerId, wire: ReceiptWire): Promise<void> {
    const message = await this.storage.messages.get(wire.messageId);
    if (message === undefined) return;
    const self = await this.identity.load();
    if (message.senderId !== self.peerId) return;
    if (message.status !== 'pending' && message.status !== 'sent') return;
    const conversation = await this.storage.conversations.get(
      message.conversationId,
    );
    if (conversation?.peerId !== from) return;
    await this.setStatus(wire.messageId, 'delivered');
  }

  private async sendReceipt(peerId: PeerId, messageId: MessageId): Promise<void> {
    try {
      await this.network.send(
        peerId,
        CHANNELS.messaging,
        encodeReceipt(messageId),
      );
    } catch {
      // Receipts are best-effort; the received message is already durable.
      this.logger.debug('Receipt not sent', { peerId, messageId });
    }
  }
}
