import type { AppEvents, EventBus, Subscription } from '#contracts/events.ts';
import type {
  ChannelName,
  IncomingPeerMessage,
  PeerMessageHandler,
  PeerNetwork,
  SendOptions,
} from '#contracts/network.ts';
import type { ConnectionInfo, ConnectionState, PeerInfo } from '#contracts/peer.ts';
import type { Logger } from '#contracts/logging.ts';
import type { Clock } from '#types/time.ts';
import type { PeerId } from '#types/ids.ts';
import { AppError } from '#core/errors.ts';
import { createLogger } from '#core/logging.ts';
import { TypedEventBus } from '#core/events.ts';
import { systemClock } from '#core/clock.ts';

export interface MockNetworkOptions {
  readonly clock?: Clock;
  readonly events?: EventBus<AppEvents>;
  readonly logger?: Logger;
  /** Enables simulated connection/send latency. Defaults to 0. */
  readonly latencyMs?: number;
  /** When true (default) `send` connects to a reachable peer automatically. */
  readonly autoConnect?: boolean;
}

export interface MockPeerInput {
  readonly peerId: PeerId;
  readonly displayName: string;
  readonly deviceName?: string;
  readonly platform?: string;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/**
 * In-memory PeerNetwork for messaging, group and transfer development. It does
 * no real networking. Incoming traffic is injected with `deliverFrom`, so
 * failure, delay and duplicate scenarios are deterministic.
 */
export class MockPeerNetwork implements PeerNetwork {
  readonly events: EventBus<AppEvents>;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private readonly latencyMs: number;
  private readonly autoConnect: boolean;
  private readonly peers = new Map<PeerId, PeerInfo>();
  private readonly connections = new Map<PeerId, ConnectionInfo>();
  private readonly handlers = new Map<ChannelName, Set<PeerMessageHandler>>();
  private readonly offlinePeers = new Set<PeerId>();
  private failedSends = 0;

  constructor(options: MockNetworkOptions = {}) {
    this.clock = options.clock ?? systemClock;
    this.events = options.events ?? new TypedEventBus<AppEvents>();
    this.logger =
      options.logger ??
      createLogger({ level: 'error', sink: () => undefined });
    this.latencyMs = Math.max(0, options.latencyMs ?? 0);
    this.autoConnect = options.autoConnect ?? true;
  }

  async startDiscovery(): Promise<void> {
    // Discovery is implicit: peers appear through `addPeer`.
  }

  async stopDiscovery(): Promise<void> {
    // Discovery is implicit in the mock.
  }

  listPeers(): readonly PeerInfo[] {
    return [...this.peers.values()];
  }

  getPeer(peerId: PeerId): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  getConnection(peerId: PeerId): ConnectionInfo | undefined {
    return this.connections.get(peerId);
  }

  async connect(peerId: PeerId): Promise<ConnectionInfo> {
    const peer = this.peers.get(peerId);
    if (peer === undefined) {
      throw new AppError('not_found', `Peer "${peerId}" is not known`);
    }
    if (this.offlinePeers.has(peerId)) {
      throw new AppError('unavailable', `Peer "${peerId}" is offline`);
    }
    const current = this.connections.get(peerId);
    if (current?.state === 'connected') return current;

    this.setConnection(peerId, 'connecting');
    await this.wait();
    const connected: ConnectionInfo = {
      peerId,
      state: 'connected',
      since: this.clock.now(),
    };
    this.connections.set(peerId, connected);
    this.updatePeerConnection(peerId, 'connected');
    this.events.emit('network.connection.changed', connected);
    return connected;
  }

  async disconnect(peerId: PeerId): Promise<void> {
    if (!this.peers.has(peerId)) {
      throw new AppError('not_found', `Peer "${peerId}" is not known`);
    }
    this.setConnection(peerId, 'disconnected');
  }

  /** Puts a known peer into the reconnecting state for failure tests. */
  markReconnecting(peerId: PeerId): void {
    const peer = this.peers.get(peerId);
    if (peer === undefined) {
      throw new AppError('not_found', `Peer "${peerId}" is not known`);
    }
    if (this.offlinePeers.has(peerId)) {
      throw new AppError('unavailable', `Peer "${peerId}" is offline`);
    }
    this.setConnection(peerId, 'reconnecting');
  }

  async send(
    peerId: PeerId,
    _channel: ChannelName,
    _payload: Uint8Array,
    _options?: SendOptions,
  ): Promise<void> {
    if (!this.peers.has(peerId)) {
      throw new AppError('not_found', `Peer "${peerId}" is not known`);
    }
    if (this.offlinePeers.has(peerId)) {
      throw new AppError('unavailable', `Peer "${peerId}" is offline`);
    }
    if (this.failedSends > 0) {
      this.failedSends -= 1;
      throw new AppError('unavailable', `Simulated send failure to "${peerId}"`);
    }
    if (this.connections.get(peerId)?.state !== 'connected') {
      if (!this.autoConnect) {
        throw new AppError('unavailable', `Peer "${peerId}" is not connected`);
      }
      await this.connect(peerId);
    }
    await this.wait();
  }

  onMessage(
    channel: ChannelName,
    handler: PeerMessageHandler,
  ): Subscription {
    let set = this.handlers.get(channel);
    if (set === undefined) {
      set = new Set();
      this.handlers.set(channel, set);
    }
    set.add(handler);
    let active = true;
    return {
      unsubscribe: () => {
        if (!active) return;
        active = false;
        const current = this.handlers.get(channel);
        if (current === undefined) return;
        current.delete(handler);
        if (current.size === 0) this.handlers.delete(channel);
      },
    };
  }

  /** Simulates discovery; repeated calls for a peer update instead of duplicating. */
  addPeer(input: MockPeerInput): PeerInfo {
    const now = this.clock.now();
    const existing = this.peers.get(input.peerId);
    if (existing !== undefined) {
      const updated: PeerInfo = {
        ...existing,
        displayName: input.displayName,
        lastSeenAt: now,
        availability: 'available',
      };
      this.peers.set(input.peerId, updated);
      this.offlinePeers.delete(input.peerId);
      this.events.emit('network.peer.updated', updated);
      return updated;
    }

    const peer: PeerInfo = {
      peerId: input.peerId,
      displayName: input.displayName,
      availability: 'available',
      connectionState: 'disconnected',
      discoveredAt: now,
      lastSeenAt: now,
      ...(input.deviceName === undefined ? {} : { deviceName: input.deviceName }),
      ...(input.platform === undefined ? {} : { platform: input.platform }),
    };
    this.peers.set(input.peerId, peer);
    this.connections.set(input.peerId, {
      peerId: input.peerId,
      state: 'disconnected',
      since: now,
    });
    this.events.emit('network.peer.discovered', peer);
    return peer;
  }

  /** Marks a peer offline (it stays in the list so history/status remain visible). */
  markPeerOffline(peerId: PeerId): void {
    const peer = this.peers.get(peerId);
    if (peer === undefined) {
      throw new AppError('not_found', `Peer "${peerId}" is not known`);
    }
    this.offlinePeers.add(peerId);
    const updated: PeerInfo = {
      ...peer,
      availability: 'offline',
      connectionState: 'disconnected',
      lastSeenAt: this.clock.now(),
    };
    this.peers.set(peerId, updated);
    const connection = this.connections.get(peerId);
    if (connection !== undefined && connection.state !== 'disconnected') {
      this.connections.set(peerId, {
        peerId,
        state: 'disconnected',
        since: this.clock.now(),
      });
      this.events.emit('network.connection.changed', {
        peerId,
        state: 'disconnected',
        since: this.clock.now(),
      });
    }
    this.events.emit('network.peer.lost', { peerId });
    this.events.emit('network.peer.updated', updated);
  }

  /** Removes a peer entirely, as when a device leaves the network. */
  forgetPeer(peerId: PeerId): void {
    if (!this.peers.delete(peerId)) {
      throw new AppError('not_found', `Peer "${peerId}" is not known`);
    }
    this.connections.delete(peerId);
    this.offlinePeers.delete(peerId);
    this.events.emit('network.peer.lost', { peerId });
  }

  /** Makes the next `count` sends fail with an unavailable error. */
  failNextSends(count = 1): void {
    this.failedSends += Math.max(0, count);
  }

  /** Injects an incoming message as if the peer sent it over a connection. */
  async deliverFrom(
    peerId: PeerId,
    channel: ChannelName,
    payload: Uint8Array,
  ): Promise<void> {
    if (!this.peers.has(peerId)) {
      this.addPeer({ peerId, displayName: peerId });
    }
    const message: IncomingPeerMessage = {
      from: peerId,
      channel,
      payload: new Uint8Array(payload),
      receivedAt: this.clock.now(),
    };
    const set = this.handlers.get(channel);
    if (set === undefined) return;
    for (const handler of [...set]) {
      try {
        const result = handler(message);
        if (isThenable(result)) {
          Promise.resolve(result).catch((error: unknown) => {
            this.logger.warn('Mock peer message handler rejected', {
              channel,
              from: peerId,
              error,
            });
          });
        }
      } catch (error) {
        this.logger.warn('Mock peer message handler failed', {
          channel,
          from: peerId,
          error,
        });
      }
    }
  }

  /** Simulates duplicate delivery of the same payload (same message ID). */
  async deliverDuplicate(
    peerId: PeerId,
    channel: ChannelName,
    payload: Uint8Array,
    times = 2,
  ): Promise<void> {
    for (let index = 0; index < times; index += 1) {
      await this.deliverFrom(peerId, channel, payload);
    }
  }

  private setConnection(peerId: PeerId, state: ConnectionState): void {
    const connection: ConnectionInfo = {
      peerId,
      state,
      since: this.clock.now(),
    };
    this.connections.set(peerId, connection);
    this.updatePeerConnection(peerId, state);
    this.events.emit('network.connection.changed', connection);
  }

  private updatePeerConnection(
    peerId: PeerId,
    state: ConnectionState,
  ): void {
    const peer = this.peers.get(peerId);
    if (peer === undefined) return;
    const updated: PeerInfo = {
      ...peer,
      connectionState: state,
      lastSeenAt: this.clock.now(),
    };
    this.peers.set(peerId, updated);
    this.events.emit('network.peer.updated', updated);
  }

  private async wait(): Promise<void> {
    if (this.latencyMs <= 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
