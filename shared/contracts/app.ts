import type { AppEvents, EventBus } from './events.ts';
import type { ChatMessage, Conversation, MessageQuery } from './messaging.ts';
import type { CreateGroupInput, GroupInfo } from './groups.ts';
import type { FileSource, FileTransferRecord } from './files.ts';
import type { ModuleHealthReport, ModuleStartReport } from './lifecycle.ts';
import type { PeerIdentity } from './identity.ts';
import type { PeerInfo } from './peer.ts';
import type { ConversationId, GroupId, MessageId, PeerId, TransferId } from '../types/ids.ts';

/**
 * UI-facing facade implemented by the integration layer. It composes feature
 * modules; it does not reimplement them. The UI never touches storage or
 * network internals directly.
 */
export interface MessengerApi {
  readonly events: EventBus<AppEvents>;

  getIdentity(): Promise<PeerIdentity>;
  updateDisplayName(displayName: string): Promise<PeerIdentity>;

  listPeers(): readonly PeerInfo[];

  listConversations(): Promise<readonly Conversation[]>;
  listMessages(
    conversationId: ConversationId,
    query?: MessageQuery,
  ): Promise<readonly ChatMessage[]>;
  sendMessage(conversationId: ConversationId, body: string): Promise<ChatMessage>;
  retryMessage(messageId: MessageId): Promise<ChatMessage>;
  markConversationRead(conversationId: ConversationId): Promise<void>;

  listGroups(): Promise<readonly GroupInfo[]>;
  createGroup(input: CreateGroupInput): Promise<GroupInfo>;
  listGroupMessages(
    groupId: GroupId,
    query?: MessageQuery,
  ): Promise<readonly ChatMessage[]>;
  sendGroupMessage(groupId: GroupId, body: string): Promise<ChatMessage>;

  sendFile(peerId: PeerId, file: FileSource): Promise<FileTransferRecord>;
  acceptFileTransfer(transferId: TransferId): Promise<FileTransferRecord>;
  rejectFileTransfer(transferId: TransferId): Promise<FileTransferRecord>;
  listTransfers(): Promise<readonly FileTransferRecord[]>;

  getModuleHealth(): readonly ModuleHealthReport[];
}

export interface ApplicationHost {
  readonly api: MessengerApi;
  readonly events: EventBus<AppEvents>;
  start(): Promise<ModuleStartReport>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
