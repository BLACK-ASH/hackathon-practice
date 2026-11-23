import type { ErrorInfo } from './errors.ts';
import type { PeerId } from '../types/ids.ts';

/** Discoverable on the network, even if not directly connected. */
export type PeerAvailability = 'nearby' | 'available' | 'offline';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

/** Public peer snapshot. Network endpoints are deliberately not exposed. */
export interface PeerInfo {
  readonly peerId: PeerId;
  readonly displayName: string;
  readonly deviceName?: string;
  readonly platform?: string;
  readonly availability: PeerAvailability;
  readonly connectionState: ConnectionState;
  readonly discoveredAt: number;
  readonly lastSeenAt: number;
}

export interface ConnectionInfo {
  readonly peerId: PeerId;
  readonly state: ConnectionState;
  /** Timestamp of the most recent state transition. */
  readonly since: number;
  readonly lastError?: ErrorInfo;
}
