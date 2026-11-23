import type { PeerInfo } from '#contracts/peer.ts';
import {
  availabilityLabel,
  connectionLabel,
  deviceLabel,
  platformLabel,
  statusTone,
} from './peerStatus.ts';

function makePeer(overrides: Partial<PeerInfo> = {}): PeerInfo {
  return {
    peerId: 'peer_test',
    displayName: 'Test Device',
    availability: 'available',
    connectionState: 'disconnected',
    discoveredAt: Date.UTC(2026, 0, 1, 9, 0, 0),
    lastSeenAt: Date.UTC(2026, 0, 1, 9, 5, 0),
    ...overrides,
  };
}

describe('peer status mapping', () => {
  it('maps connection and availability states to user-facing labels', () => {
    expect(connectionLabel(makePeer({ connectionState: 'connected' }))).toBe('Connected');
    expect(connectionLabel(makePeer({ connectionState: 'connecting' }))).toBe('Connecting');
    expect(connectionLabel(makePeer({ connectionState: 'reconnecting' }))).toBe('Reconnecting');
    expect(connectionLabel(makePeer({ connectionState: 'disconnected' }))).toBe('Disconnected');

    expect(
      connectionLabel(
        makePeer({ connectionState: 'disconnected', availability: 'offline' }),
      ),
    ).toBe('Unavailable');
  });

  it('maps availability labels', () => {
    expect(availabilityLabel('nearby')).toBe('Nearby');
    expect(availabilityLabel('available')).toBe('Available');
    expect(availabilityLabel('offline')).toBe('Offline');
  });

  it('formats optional platform and device fields safely', () => {
    expect(platformLabel('android')).toBe('Android');
    expect(platformLabel('ios')).toBe('iOS');
    expect(platformLabel('macos')).toBe('macOS');
    expect(platformLabel(undefined)).toBe('Platform unavailable');
    expect(deviceLabel(makePeer())).toBe('Device name unavailable');
    expect(deviceLabel(makePeer({ deviceName: 'Pixel 8' }))).toBe('Pixel 8');
  });

  it('maps status tones for styling', () => {
    expect(statusTone(makePeer({ connectionState: 'connected' }))).toBe('positive');
    expect(statusTone(makePeer({ connectionState: 'connecting' }))).toBe('pending');
    expect(statusTone(makePeer({ connectionState: 'reconnecting' }))).toBe('pending');
    expect(statusTone(makePeer({ availability: 'offline' }))).toBe('muted');
  });
});
