import type { ChatMessage, Conversation, MessageQuery, MessageStatus } from './messaging.ts';
import type { GroupInfo } from './groups.ts';
import type { FileTransferRecord } from './files.ts';
import type { PeerIdentity } from './identity.ts';
import type { ConversationId, GroupId, MessageId, TransferId } from '../types/ids.ts';

/**
 * Storage contracts are shared infrastructure. Feature modules depend only on
 * these interfaces; the storage module chooses the on-device database and
 * platform locations. All reads return copies, never live database objects.
 */

export interface IdentityRepository {
  get(): Promise<PeerIdentity | undefined>;
  save(identity: PeerIdentity): Promise<void>;
}

export interface SettingsRepository {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ConversationRepository {
  get(id: ConversationId): Promise<Conversation | undefined>;
  list(): Promise<readonly Conversation[]>;
  save(conversation: Conversation): Promise<void>;
}

export interface MessageRepository {
  get(id: MessageId): Promise<ChatMessage | undefined>;
  /** Ascending by `createdAt`; `limit` applies from the newest end. */
  listByConversation(
    conversationId: ConversationId,
    query?: MessageQuery,
  ): Promise<readonly ChatMessage[]>;
  save(message: ChatMessage): Promise<void>;
  updateStatus(id: MessageId, status: MessageStatus): Promise<void>;
}

export interface GroupRepository {
  get(id: GroupId): Promise<GroupInfo | undefined>;
  list(): Promise<readonly GroupInfo[]>;
  save(group: GroupInfo): Promise<void>;
  delete(id: GroupId): Promise<void>;
}

export interface TransferRepository {
  get(id: TransferId): Promise<FileTransferRecord | undefined>;
  list(): Promise<readonly FileTransferRecord[]>;
  save(transfer: FileTransferRecord): Promise<void>;
}

export interface StorageService {
  readonly identity: IdentityRepository;
  readonly settings: SettingsRepository;
  readonly conversations: ConversationRepository;
  readonly messages: MessageRepository;
  readonly groups: GroupRepository;
  readonly transfers: TransferRepository;
}
