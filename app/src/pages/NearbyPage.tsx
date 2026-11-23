import { useMessenger } from '../integration/MessengerProvider.tsx';
import { PeerDirectory } from '../peers/PeerDirectory.tsx';
import styles from './DataPages.module.css';

export function NearbyPage() {
  const {
    connectionErrors,
    connectToPeer,
    disconnectFromPeer,
    error,
    isMock,
    peers,
    pendingPeerIds,
    state,
  } = useMessenger();

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

      <PeerDirectory
        connectionErrors={connectionErrors}
        error={error}
        onConnect={connectToPeer}
        onDisconnect={disconnectFromPeer}
        peers={peers}
        pendingPeerIds={pendingPeerIds}
        state={state}
      />
    </section>
  );
}
