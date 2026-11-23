import type { PeerAvailability, PeerInfo } from '#contracts/peer.ts';

export type PeerStatusTone = 'positive' | 'pending' | 'muted' | 'error';

export function connectionLabel(peer: PeerInfo): string {
  switch (peer.connectionState) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'reconnecting':
      return 'Reconnecting';
    case 'disconnected':
      return peer.availability === 'offline' ? 'Unavailable' : 'Disconnected';
  }
}

export function availabilityLabel(availability: PeerAvailability): string {
  switch (availability) {
    case 'nearby':
      return 'Nearby';
    case 'available':
      return 'Available';
    case 'offline':
      return 'Offline';
  }
}

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  android: 'Android',
  ios: 'iOS',
  linux: 'Linux',
  macos: 'macOS',
  windows: 'Windows',
};

export function platformLabel(platform: string | undefined): string {
  if (platform === undefined || platform.trim().length === 0) {
    return 'Platform unavailable';
  }
  const value = platform.trim();
  return PLATFORM_LABELS[value.toLowerCase()] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

export function deviceLabel(peer: PeerInfo): string {
  return peer.deviceName ?? 'Device name unavailable';
}

export function statusTone(peer: PeerInfo): PeerStatusTone {
  if (peer.availability === 'offline') return 'muted';
  switch (peer.connectionState) {
    case 'connected':
      return 'positive';
    case 'connecting':
    case 'reconnecting':
      return 'pending';
    case 'disconnected':
      return 'muted';
  }
}
