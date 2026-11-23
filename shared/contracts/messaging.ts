import type { AppEvents, EventBus } from './events.ts';
import type { ConversationId, GroupId, MessageId, PeerId } from '../types/ids.ts';
export type ConversationKind = 'private' | 'group';

/**
 * Outgoing states move pending -> sent -> delivered (or failed). Incoming
 * messages are stored as received.
 */
export type MessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'received';

export interface ChatMessage {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly senderId: PeerId;
  readonly senderName: string;
  readonly body: string;
  readonly createdAt: number;
  readonly status: MessageStatus;
}

export interface Conversation {
  readonly id: ConversationId;
  readonly kind: ConversationKind;
  /** For private conversations: the other participant. */
  readonly peerId?: PeerId;
  /** For group conversations: the group. */
  readonly groupId?: GroupId;
  readonly title: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly unreadCount: number;
  readonly lastMessagePreview?: string;
}

export interface MessageQuery {
  /** Exclusive upper bound on `createdAt`, for loading older history. */
  readonly before?: number;
  /** Exclusive lower bound on `createdAt`. */
  readonly after?: number;
  readonly limit?: number;
}

export interface MessagingService {
  readonly events: EventBus<AppEvents>;

  listConversations(): Promise<readonly Conversation[]>;
  getConversation(id: ConversationId): Promise<Conversation | undefined>;
  getOrCreatePrivateConversation(
    peerId: PeerId,
    peerName: string,
  ): Promise<Conversation>;

  listMessages(
    conversationId: ConversationId,
    query?: MessageQuery,
  ): Promise<readonly ChatMessage[]>;
  sendMessage(conversationId: ConversationId, body: string): Promise<ChatMessage>;
  retryMessage(messageId: MessageId): Promise<ChatMessage>;
  markConversationRead(conversationId: ConversationId): Promise<void>;
}

/** Stable conversation IDs shared by messaging, storage and the UI. */
export function privateConversationId(peerId: PeerId): ConversationId {
  return `dm:${peerId}`;
}

export function groupConversationId(groupId: GroupId): ConversationId {
  return `group:${groupId}`;
}
