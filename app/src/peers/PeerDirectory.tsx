import type { ErrorInfo } from '#contracts/errors.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.tsx';
import type { MessengerLoadState } from '../integration/MessengerProvider.tsx';
import { PeerCard } from './PeerCard.tsx';
import { PeerDetails } from './PeerDetails.tsx';
import styles from './PeerDirectory.module.css';

export interface PeerDirectoryProps {
  readonly state: MessengerLoadState;
  readonly error: ErrorInfo | undefined;
  readonly peers: readonly PeerInfo[];
  readonly pendingPeerIds?: readonly PeerInfo['peerId'][];
  readonly connectionErrors?: Readonly<Partial<Record<PeerInfo['peerId'], ErrorInfo>>>;
  readonly onConnect?: (peerId: PeerInfo['peerId']) => Promise<void>;
  readonly onDisconnect?: (peerId: PeerInfo['peerId']) => Promise<void>;
}

function connectionRank(peer: PeerInfo): number {
  if (peer.availability === 'offline') return 5;
  switch (peer.connectionState) {
    case 'connected':
      return 0;
    case 'connecting':
      return 1;
    case 'reconnecting':
      return 2;
    case 'disconnected':
      return 3;
  }
}

function comparePeers(a: PeerInfo, b: PeerInfo): number {
  return (
    connectionRank(a) - connectionRank(b) ||
    a.displayName.localeCompare(b.displayName) ||
    a.peerId.localeCompare(b.peerId)
  );
}

export function PeerDirectory({
  state,
  error,
  peers,
  pendingPeerIds = [],
  connectionErrors = {},
  onConnect,
  onDisconnect,
}: PeerDirectoryProps) {
  const [selectedPeerId, setSelectedPeerId] = useState<PeerInfo['peerId']>();
  const orderedPeers = useMemo(() => [...peers].sort(comparePeers), [peers]);
  const selectedPeer = orderedPeers.find((peer) => peer.peerId === selectedPeerId);
  const hasSelectedPeer = selectedPeer !== undefined;

  useEffect(() => {
    if (selectedPeerId !== undefined && !hasSelectedPeer) {
      setSelectedPeerId(undefined);
    }
  }, [hasSelectedPeer, selectedPeerId]);

  const toggleDetails = useCallback((peerId: PeerInfo['peerId']) => {
    setSelectedPeerId((current) => (current === peerId ? undefined : peerId));
  }, []);

  return (
    <section aria-labelledby="peer-directory-heading" className={styles.section}>
      <header className={styles.summary}>
        <h2 id="peer-directory-heading">Discovered devices</h2>
        <p>
          {peers.length === 0
            ? 'Waiting for devices on this network'
            : `${peers.length} device${peers.length === 1 ? '' : 's'} listed`}
        </p>
      </header>

      {state === 'loading' && <LoadingState title="Loading nearby devices" />}
      {state === 'error' && (
        <ErrorState message={error?.message ?? 'The peer directory could not be read.'} />
      )}
      {state === 'ready' && peers.length === 0 && (
        <EmptyState title="No nearby devices">
          Discovered devices will appear here.
        </EmptyState>
      )}
      {state === 'ready' && peers.length > 0 && (
        <ul className={styles.list}>
          {orderedPeers.map((peer) => {
            const detailsId = `peer-details-${peer.peerId}`;
            const expanded = selectedPeerId === peer.peerId;
            return (
              <li className={styles.item} key={peer.peerId}>
                <PeerCard
                  actionError={connectionErrors[peer.peerId]}
                  detailsId={detailsId}
                  expanded={expanded}
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  onToggleDetails={toggleDetails}
                  peer={peer}
                  pending={pendingPeerIds.includes(peer.peerId)}
                />
                {expanded && selectedPeer?.peerId === peer.peerId && (
                  <PeerDetails
                    detailsId={detailsId}
                    onClose={() => toggleDetails(peer.peerId)}
                    peer={peer}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
