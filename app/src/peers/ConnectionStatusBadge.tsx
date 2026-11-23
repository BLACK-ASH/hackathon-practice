import type { PeerInfo } from '#contracts/peer.ts';
import { connectionLabel, statusTone } from './peerStatus.ts';
import styles from './PeerDirectory.module.css';

interface ConnectionStatusBadgeProps {
  readonly peer: PeerInfo;
}

export function ConnectionStatusBadge({ peer }: ConnectionStatusBadgeProps) {
  const label = connectionLabel(peer);
  return (
    <span
      aria-label={`Connection: ${label}`}
      className={`${styles.badge} ${styles[statusTone(peer)]}`}
    >
      {label}
    </span>
  );
}
