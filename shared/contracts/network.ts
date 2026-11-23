import type { AppEvents, EventBus, Subscription } from './events.ts';
import type { ConnectionInfo, PeerInfo } from './peer.ts';
import type { PeerId } from '../types/ids.ts';

/** Feature modules register handlers per channel; payloads stay opaque here. */
export type ChannelName = string;

export const CHANNELS = {
  messaging: 'messaging',
  groups: 'groups',
  files: 'files',
} as const;

export interface IncomingPeerMessage {
  readonly from: PeerId;
  readonly channel: ChannelName;
  readonly payload: Uint8Array;
  readonly receivedAt: number;
}

export type PeerMessageHandler = (
  message: IncomingPeerMessage,
) => void | Promise<void>;

export interface SendOptions {
  readonly timeoutMs?: number;
}

/**
 * Public network capability consumed by messaging, groups, file transfer and
 * the UI. Discovery adapters, sockets, endpoints and reconnection policy are
 * internal to the network module.
 */
export interface PeerNetwork {
  readonly events: EventBus<AppEvents>;

  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;

  listPeers(): readonly PeerInfo[];
  getPeer(peerId: PeerId): PeerInfo | undefined;
  getConnection(peerId: PeerId): ConnectionInfo | undefined;

  connect(peerId: PeerId): Promise<ConnectionInfo>;
  disconnect(peerId: PeerId): Promise<void>;

  /** Throws an AppError when the peer is unreachable or the send fails. */
  send(
    peerId: PeerId,
    channel: ChannelName,
    payload: Uint8Array,
    options?: SendOptions,
  ): Promise<void>;

  /** Handler failures are isolated by the transport implementation. */
  onMessage(channel: ChannelName, handler: PeerMessageHandler): Subscription;
}
