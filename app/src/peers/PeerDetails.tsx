import type { PeerInfo } from '#contracts/peer.ts';
import { formatTime } from '../pages/format.ts';
import {
  availabilityLabel,
  connectionLabel,
  deviceLabel,
  platformLabel,
} from './peerStatus.ts';
import styles from './PeerDirectory.module.css';

interface PeerDetailsProps {
  readonly peer: PeerInfo;
  readonly detailsId: string;
  readonly onClose: () => void;
}

export function PeerDetails({ peer, detailsId, onClose }: PeerDetailsProps) {
  return (
    <aside aria-labelledby={`${detailsId}-title`} className={styles.details} id={detailsId}>
      <div className={styles.detailsHeader}>
        <h4 id={`${detailsId}-title`}>Device details</h4>
        <button
          aria-label={`Hide details for ${peer.displayName}`}
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          Hide details
        </button>
      </div>
      <dl className={styles.metaGrid}>
        <div>
          <dt>Device</dt>
          <dd>{deviceLabel(peer)}</dd>
        </div>
        <div>
          <dt>Platform</dt>
          <dd>{platformLabel(peer.platform)}</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>{availabilityLabel(peer.availability)}</dd>
        </div>
        <div>
          <dt>Connection</dt>
          <dd>{connectionLabel(peer)}</dd>
        </div>
        <div>
          <dt>Discovered</dt>
          <dd>{formatTime(peer.discoveredAt)}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{formatTime(peer.lastSeenAt)}</dd>
        </div>
      </dl>
    </aside>
  );
}
