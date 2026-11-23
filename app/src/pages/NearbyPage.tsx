import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useMessenger } from '../integration/MessengerProvider';
import type { PeerInfo } from '#contracts/peer.ts';
import styles from './DataPages.module.css';
import { formatTime } from './format';

function peerStatus(peer: PeerInfo): string {
  if (peer.connectionState === 'connected') return 'Connected';
  if (peer.connectionState === 'connecting') return 'Connecting';
  if (peer.connectionState === 'reconnecting') return 'Reconnecting';
  if (peer.availability === 'offline') return 'Offline';
  if (peer.availability === 'available') return 'Available';
  return 'Nearby';
}

export function NearbyPage() {
  const { state, error, peers, isMock } = useMessenger();

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Nearby Devices</h1>
        <p>
          {isMock
            ? 'Device status from the mock peer registry. No live discovery is running.'
            : 'Device status from the peer registry.'}
        </p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock peers from Core. Real local-network discovery belongs to Sachin's network module.
        </div>
      )}

      {state === 'loading' && <LoadingState />}
      {state === 'error' && (
        <ErrorState message={error?.message ?? 'The peer directory could not be read.'} />
      )}
      {state === 'ready' && peers.length === 0 && (
        <EmptyState title="No nearby devices">Discovered devices will appear here.</EmptyState>
      )}
      {state === 'ready' && peers.length > 0 && (
        <ul className={styles.list}>
          {peers.map((peer) => (
            <li className={styles.card} key={peer.peerId}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{peer.displayName}</h2>
                <span
                  className={`${styles.badge} ${peer.availability === 'offline' ? styles.badgeMuted : ''}`}
                >
                  {peerStatus(peer)}
                </span>
              </div>
              <p className={styles.meta}>
                {peer.deviceName ?? 'Device name unavailable'} · last seen {formatTime(peer.lastSeenAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
