import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  ConnectionState,
  PeerAvailability,
  PeerInfo,
} from '#contracts/peer.ts';
import {
  describePeer,
  filterPeers,
  peerDisplayName,
  peerInitials,
  peerState,
  peerSubtitle,
} from '#core/contacts.ts';

function makePeer(overrides: Partial<PeerInfo> = {}): PeerInfo {
  return {
    peerId: 'peer_1',
    displayName: 'Aisha',
    availability: 'available',
    connectionState: 'disconnected',
    discoveredAt: 100,
    lastSeenAt: 200,
    ...overrides,
  };
}

test('peerState maps existing availability and connection states to user labels', () => {
  const cases: readonly [PeerAvailability, ConnectionState, string, string][] = [
    ['offline', 'connected', 'Offline', 'negative'],
    ['available', 'reconnecting', 'Reconnecting…', 'warning'],
    ['available', 'connecting', 'Connecting…', 'warning'],
    ['available', 'connected', 'Connected', 'positive'],
    ['nearby', 'disconnected', 'Nearby', 'neutral'],
    ['available', 'disconnected', 'Available', 'neutral'],
  ];

  for (const [availability, connectionState, label, tone] of cases) {
    assert.deepEqual(peerState(makePeer({ availability, connectionState })), {
      label,
      tone,
    });
  }
});

test('peer presentation uses available fields and falls back to the peer ID', () => {
  const described = describePeer(
    makePeer({
      peerId: 'peer_42',
      displayName: '  Aisha B.  ',
      deviceName: ' Pixel 8 ',
      platform: 'android',
    }),
  );

  assert.equal(described.displayName, 'Aisha B.');
  assert.equal(described.initials, 'AB');
  assert.equal(described.subtitle, 'Pixel 8 · Android');
  assert.equal(described.stateLabel, 'Available');
  assert.equal(described.stateTone, 'neutral');
  assert.ok(described.searchText.includes('pixel 8'));
  assert.ok(described.searchText.includes('peer_42'));

  const minimal = describePeer(
    makePeer({
      displayName: '   ',
      peerId: 'peer_7',
      deviceName: undefined,
      platform: undefined,
    }),
  );

  assert.equal(minimal.displayName, 'peer_7');
  assert.equal(minimal.initials, 'P');
  assert.equal(minimal.subtitle, undefined);
});

test('peer name and subtitle helpers ignore missing or blank optional data', () => {
  assert.equal(peerDisplayName(makePeer({ displayName: '  Rahul  ' })), 'Rahul');
  assert.equal(peerDisplayName(makePeer({ displayName: '', peerId: 'p9' })), 'p9');
  assert.equal(peerInitials(makePeer({ displayName: 'Aisha B.' })), 'AB');
  assert.equal(peerSubtitle(makePeer({ platform: 'macos' })), 'macOS');
  assert.equal(peerSubtitle(makePeer({ platform: 'iOS' })), 'iOS');
  assert.equal(peerSubtitle(makePeer({ deviceName: ' ', platform: '' })), undefined);
});

test('filterPeers filters by availability, connection state and query', () => {
  const peers = [
    makePeer({
      peerId: 'p1',
      displayName: 'Aisha',
      deviceName: 'Pixel 8',
      platform: 'android',
      availability: 'available',
      connectionState: 'disconnected',
    }),
    makePeer({
      peerId: 'p2',
      displayName: 'Rahul',
      deviceName: 'ThinkPad',
      platform: 'linux',
      availability: 'nearby',
      connectionState: 'connected',
    }),
    makePeer({
      peerId: 'p3',
      displayName: 'Sam',
      availability: 'offline',
      connectionState: 'disconnected',
    }),
  ];

  assert.deepEqual(filterPeers(peers), peers);
  assert.deepEqual(
    filterPeers(peers, { availability: 'nearby' }).map((peer) => peer.peerId),
    ['p2'],
  );
  assert.deepEqual(
    filterPeers(peers, { connectionState: 'connected' }).map(
      (peer) => peer.peerId,
    ),
    ['p2'],
  );
  assert.deepEqual(
    filterPeers(peers, { query: 'pixel' }).map((peer) => peer.peerId),
    ['p1'],
  );
  assert.deepEqual(
    filterPeers(peers, { query: 'LINUX' }).map((peer) => peer.peerId),
    ['p2'],
  );
  assert.deepEqual(
    filterPeers(peers, { availability: 'available', query: 'rahul' }),
    [],
  );
  assert.deepEqual(
    filterPeers(peers, { query: '   ' }).map((peer) => peer.peerId),
    ['p1', 'p2', 'p3'],
  );
});
