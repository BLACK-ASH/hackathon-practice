import type {
  ChatMessage,
  Conversation,
  MessageQuery,
  MessageStatus,
} from '#contracts/messaging.ts';
import type { GroupInfo } from '#contracts/groups.ts';
import type { FileTransferRecord } from '#contracts/files.ts';
import type { PeerIdentity } from '#contracts/identity.ts';
import type { StorageService } from '#contracts/storage.ts';
import type { ConversationId, GroupId, MessageId, TransferId } from '#types/ids.ts';
import { AppError } from '#core/errors.ts';

export type StorageOperation =
  | 'identity.get'
  | 'identity.save'
  | 'settings.get'
  | 'settings.set'
  | 'settings.delete'
  | 'conversations.get'
  | 'conversations.list'
  | 'conversations.save'
  | 'messages.get'
  | 'messages.listByConversation'
  | 'messages.save'
  | 'messages.updateStatus'
  | 'groups.get'
  | 'groups.list'
  | 'groups.save'
  | 'groups.delete'
  | 'transfers.get'
  | 'transfers.list'
  | 'transfers.save';

function copy<T>(value: T): T {
  return structuredClone(value);
}

function sortMessages(
  messages: Iterable<ChatMessage>,
  query?: MessageQuery,
): ChatMessage[] {
  if (query?.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 0)) {
    throw new AppError('invalid_argument', 'Message limit must be a non-negative integer');
  }
  let list = [...messages].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
  if (query?.after !== undefined) {
    list = list.filter((message) => message.createdAt > query.after!);
  }
  if (query?.before !== undefined) {
    list = list.filter((message) => message.createdAt < query.before!);
  }
  if (query?.limit !== undefined) {
    if (query.limit === 0) return [];
    list =
      query.before !== undefined
        ? list.slice(-query.limit)
        : list.slice(0, query.limit);
  }
  return list;
}

/**
 * In-memory StorageService for module development and tests. It simulates a
 * real database by cloning on read/write and can inject one failure per
 * operation. It is a mock, not durable storage.
 */
export class InMemoryStorage implements StorageService {
  private readonly identities = new Map<string, PeerIdentity>();
  private readonly settingsMap = new Map<string, unknown>();
  private readonly conversationMap = new Map<ConversationId, Conversation>();
  private readonly messageMap = new Map<MessageId, ChatMessage>();
  private readonly groupMap = new Map<GroupId, GroupInfo>();
  private readonly transferMap = new Map<TransferId, FileTransferRecord>();
  private readonly failures = new Map<StorageOperation, AppError>();

  readonly identity = {
    get: async (): Promise<PeerIdentity | undefined> => {
      this.check('identity.get');
      const value = this.identities.get('local');
      return value === undefined ? undefined : copy(value);
    },
    save: async (value: PeerIdentity): Promise<void> => {
      this.check('identity.save');
      this.identities.set('local', copy(value));
    },
  };

  readonly settings = {
    get: async <T>(key: string): Promise<T | undefined> => {
      this.check('settings.get');
      const value = this.settingsMap.get(key);
      return value === undefined ? undefined : copy(value as T);
    },
    set: async <T>(key: string, value: T): Promise<void> => {
      this.check('settings.set');
      this.settingsMap.set(key, copy(value));
    },
    delete: async (key: string): Promise<void> => {
      this.check('settings.delete');
      this.settingsMap.delete(key);
    },
  };

  readonly conversations = {
    get: async (id: ConversationId): Promise<Conversation | undefined> => {
      this.check('conversations.get');
      const value = this.conversationMap.get(id);
      return value === undefined ? undefined : copy(value);
    },
    list: async (): Promise<readonly Conversation[]> => {
      this.check('conversations.list');
      return [...this.conversationMap.values()]
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
        )
        .map(copy);
    },
    save: async (value: Conversation): Promise<void> => {
      this.check('conversations.save');
      this.conversationMap.set(value.id, copy(value));
    },
  };

  readonly messages = {
    get: async (id: MessageId): Promise<ChatMessage | undefined> => {
      this.check('messages.get');
      const value = this.messageMap.get(id);
      return value === undefined ? undefined : copy(value);
    },
    listByConversation: async (
      conversationId: ConversationId,
      query?: MessageQuery,
    ): Promise<readonly ChatMessage[]> => {
      this.check('messages.listByConversation');
      return sortMessages(
        [...this.messageMap.values()].filter(
          (message) => message.conversationId === conversationId,
        ),
        query,
      ).map(copy);
    },
    save: async (value: ChatMessage): Promise<void> => {
      this.check('messages.save');
      this.messageMap.set(value.id, copy(value));
    },
    updateStatus: async (
      id: MessageId,
      status: MessageStatus,
    ): Promise<void> => {
      this.check('messages.updateStatus');
      const current = this.messageMap.get(id);
      if (current === undefined) {
        throw new AppError('not_found', `Message "${id}" does not exist`);
      }
      this.messageMap.set(id, { ...current, status });
    },
  };

  readonly groups = {
    get: async (id: GroupId): Promise<GroupInfo | undefined> => {
      this.check('groups.get');
      const value = this.groupMap.get(id);
      return value === undefined ? undefined : copy(value);
    },
    list: async (): Promise<readonly GroupInfo[]> => {
      this.check('groups.list');
      return [...this.groupMap.values()]
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
        )
        .map(copy);
    },
    save: async (value: GroupInfo): Promise<void> => {
      this.check('groups.save');
      this.groupMap.set(value.id, copy(value));
    },
    delete: async (id: GroupId): Promise<void> => {
      this.check('groups.delete');
      this.groupMap.delete(id);
    },
  };

  readonly transfers = {
    get: async (id: TransferId): Promise<FileTransferRecord | undefined> => {
      this.check('transfers.get');
      const value = this.transferMap.get(id);
      return value === undefined ? undefined : copy(value);
    },
    list: async (): Promise<readonly FileTransferRecord[]> => {
      this.check('transfers.list');
      return [...this.transferMap.values()]
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt || a.id.localeCompare(b.id),
        )
        .map(copy);
    },
    save: async (value: FileTransferRecord): Promise<void> => {
      this.check('transfers.save');
      this.transferMap.set(value.id, copy(value));
    },
  };

  /** The next call to `operation` throws the supplied (or a default IO) error. */
  failNext(operation: StorageOperation, error?: AppError): void {
    this.failures.set(
      operation,
      error ?? new AppError('io', `Simulated storage failure: ${operation}`),
    );
  }

  clear(): void {
    this.identities.clear();
    this.settingsMap.clear();
    this.conversationMap.clear();
    this.messageMap.clear();
    this.groupMap.clear();
    this.transferMap.clear();
    this.failures.clear();
  }

  private check(operation: StorageOperation): void {
    const failure = this.failures.get(operation);
    if (failure === undefined) return;
    this.failures.delete(operation);
    throw failure;
  }
}
