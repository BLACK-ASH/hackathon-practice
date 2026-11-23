import type {
  ConnectionState,
  PeerAvailability,
  PeerInfo,
} from '#contracts/peer.ts';

export type PeerPresentationTone =
  | 'neutral'
  | 'positive'
  | 'warning'
  | 'negative';

export interface PeerPresentation {
  readonly displayName: string;
  readonly initials: string;
  readonly subtitle?: string;
  readonly stateLabel: string;
  readonly stateTone: PeerPresentationTone;
  readonly searchText: string;
}

export interface PeerFilter {
  readonly query?: string;
  readonly availability?: PeerAvailability;
  readonly connectionState?: ConnectionState;
}

export interface PeerStatePresentation {
  readonly label: string;
  readonly tone: PeerPresentationTone;
}

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  android: 'Android',
  ios: 'iOS',
  linux: 'Linux',
  macos: 'macOS',
  windows: 'Windows',
};

function trimmed(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const result = value.trim();
  return result.length === 0 ? undefined : result;
}

function platformLabel(platform: string | undefined): string | undefined {
  const value = trimmed(platform);
  if (value === undefined) return undefined;
  const lower = value.toLocaleLowerCase();
  const known = PLATFORM_LABELS[lower];
  if (known !== undefined) return known;
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/u).filter((word) => word.length > 0);
  const source = words.length > 0 ? words : Array.from(name);
  const initials = source
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
  return initials.length > 0 ? initials : '?';
}

export function peerDisplayName(peer: PeerInfo): string {
  return trimmed(peer.displayName) ?? trimmed(peer.peerId) ?? 'Unknown peer';
}

export function peerInitials(peer: PeerInfo): string {
  return initialsOf(peerDisplayName(peer));
}

export function peerSubtitle(peer: PeerInfo): string | undefined {
  const device = trimmed(peer.deviceName);
  const platform = platformLabel(peer.platform);
  const parts = [device, platform].filter(
    (part): part is string => part !== undefined,
  );
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function peerState(peer: PeerInfo): PeerStatePresentation {
  if (peer.availability === 'offline') {
    return { label: 'Offline', tone: 'negative' };
  }
  if (peer.connectionState === 'reconnecting') {
    return { label: 'Reconnecting…', tone: 'warning' };
  }
  if (peer.connectionState === 'connecting') {
    return { label: 'Connecting…', tone: 'warning' };
  }
  if (peer.connectionState === 'connected') {
    return { label: 'Connected', tone: 'positive' };
  }
  if (peer.availability === 'nearby') {
    return { label: 'Nearby', tone: 'neutral' };
  }
  return { label: 'Available', tone: 'neutral' };
}

export function describePeer(peer: PeerInfo): PeerPresentation {
  const displayName = peerDisplayName(peer);
  const state = peerState(peer);
  const subtitle = peerSubtitle(peer);
  const searchText = [
    displayName,
    peer.peerId,
    peer.deviceName,
    peer.platform,
    state.label,
  ]
    .filter(
      (part): part is string =>
        typeof part === 'string' && part.trim().length > 0,
    )
    .map((part) => part.toLocaleLowerCase())
    .join(' ');

  return {
    displayName,
    initials: initialsOf(displayName),
    ...(subtitle === undefined ? {} : { subtitle }),
    stateLabel: state.label,
    stateTone: state.tone,
    searchText,
  };
}

export function filterPeers(
  peers: readonly PeerInfo[],
  filter: PeerFilter = {},
): readonly PeerInfo[] {
  const query = filter.query?.trim().toLocaleLowerCase() ?? '';

  return peers.filter((peer) => {
    if (
      filter.availability !== undefined &&
      peer.availability !== filter.availability
    ) {
      return false;
    }
    if (
      filter.connectionState !== undefined &&
      peer.connectionState !== filter.connectionState
    ) {
      return false;
    }
    if (query.length === 0) return true;
    return describePeer(peer).searchText.includes(query);
  });
}
