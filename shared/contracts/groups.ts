import type { AppEvents, EventBus } from './events.ts';
import type { ChatMessage, MessageQuery } from './messaging.ts';
import type { GroupId, PeerId } from '../types/ids.ts';

export type GroupRole = 'owner' | 'member';

export interface GroupMember {
  readonly peerId: PeerId;
  readonly displayName: string;
  readonly role: GroupRole;
  readonly joinedAt: number;
}

export interface GroupInfo {
  readonly id: GroupId;
  readonly name: string;
  readonly createdBy: PeerId;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly members: readonly GroupMember[];
}

export interface CreateGroupInput {
  readonly name: string;
  readonly memberIds: readonly PeerId[];
}

export interface GroupService {
  readonly events: EventBus<AppEvents>;

  listGroups(): Promise<readonly GroupInfo[]>;
  getGroup(id: GroupId): Promise<GroupInfo | undefined>;
  createGroup(input: CreateGroupInput): Promise<GroupInfo>;
  addMembers(groupId: GroupId, peerIds: readonly PeerId[]): Promise<GroupInfo>;
  removeMember(groupId: GroupId, peerId: PeerId): Promise<GroupInfo>;
  leaveGroup(groupId: GroupId): Promise<void>;

  listMessages(
    groupId: GroupId,
    query?: MessageQuery,
  ): Promise<readonly ChatMessage[]>;
  sendMessage(groupId: GroupId, body: string): Promise<ChatMessage>;
}
