import type { ErrorInfo } from './errors.ts';
import type { ModuleHealth } from './lifecycle.ts';
import type { PeerIdentity } from './identity.ts';
import type { ConnectionInfo, PeerInfo } from './peer.ts';
import type { ChatMessage, Conversation } from './messaging.ts';
import type { GroupInfo } from './groups.ts';
import type { FileTransferProgress, FileTransferRecord } from './files.ts';
import type { PeerId } from '../types/ids.ts';
import type { GroupId } from '../types/ids.ts';

export interface Subscription {
  unsubscribe(): void;
}

export type EventHandler<T> = (event: T) => void;

/**
 * In-process, synchronous event bus. Direct interfaces are used for
 * request/response work; events only announce asynchronous state changes.
 */
export interface EventBus<TEvents extends object> {
  on<K extends keyof TEvents>(
    type: K,
    handler: EventHandler<TEvents[K]>,
  ): Subscription;
  once<K extends keyof TEvents>(
    type: K,
    handler: EventHandler<TEvents[K]>,
  ): Subscription;
  emit<K extends keyof TEvents>(type: K, event: TEvents[K]): void;
  listenerCount(type: keyof TEvents): number;
  /** Remove subscribers for one type, or all subscribers when omitted. */
  clear(type?: keyof TEvents): void;
}

export interface ModuleHealthEvent {
  readonly moduleId: string;
  readonly health: ModuleHealth;
}

export interface StorageErrorEvent {
  readonly operation: string;
  readonly error: ErrorInfo;
}

/**
 * Every application-level event. Namespacing prevents collisions between
 * modules; payloads use shared contract types so no module imports another
 * module's internals.
 */
export interface AppEvents {
  'core.module.health': ModuleHealthEvent;
  'identity.changed': PeerIdentity;

  'network.peer.discovered': PeerInfo;
  'network.peer.updated': PeerInfo;
  'network.peer.lost': { readonly peerId: PeerId };
  'network.connection.changed': ConnectionInfo;

  'messaging.conversation.updated': Conversation;
  'messaging.message.received': ChatMessage;
  'messaging.message.updated': ChatMessage;

  'groups.group.updated': GroupInfo;
  'groups.group.removed': { readonly groupId: GroupId };
  'groups.message.received': ChatMessage;

  'files.transfer.updated': FileTransferRecord;
  'files.transfer.progress': FileTransferProgress;

  'storage.error': StorageErrorEvent;
}
