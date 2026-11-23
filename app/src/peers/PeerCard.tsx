import type { ErrorInfo } from '#contracts/errors.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import { formatTime } from '../pages/format.ts';
import { ConnectionStatusBadge } from './ConnectionStatusBadge.tsx';
import {
  availabilityLabel,
  deviceLabel,
  platformLabel,
} from './peerStatus.ts';
import styles from './PeerDirectory.module.css';

interface PeerCardProps {
  readonly peer: PeerInfo;
  readonly expanded: boolean;
  readonly detailsId: string;
  readonly onToggleDetails: (peerId: PeerInfo['peerId']) => void;
  readonly pending?: boolean;
  readonly actionError?: ErrorInfo;
  readonly onConnect?: (peerId: PeerInfo['peerId']) => Promise<void>;
  readonly onDisconnect?: (peerId: PeerInfo['peerId']) => Promise<void>;
}

interface ConnectionAction {
  readonly disabled: boolean;
  readonly label: string;
  readonly text: string;
}

function connectionAction(
  peer: PeerInfo,
  pending: boolean,
  hasHandler: boolean,
): ConnectionAction {
  if (pending) {
    return {
      disabled: true,
      label: `Updating connection for ${peer.displayName}`,
      text: 'Updating…',
    };
  }
  if (peer.availability === 'offline') {
    return { disabled: true, label: `Connect to ${peer.displayName}`, text: 'Connect' };
  }
  if (peer.connectionState === 'connected') {
    return {
      disabled: !hasHandler,
      label: `Disconnect from ${peer.displayName}`,
      text: 'Disconnect',
    };
  }
  if (peer.connectionState === 'connecting') {
    return {
      disabled: true,
      label: `Connecting to ${peer.displayName}`,
      text: 'Connecting…',
    };
  }
  if (peer.connectionState === 'reconnecting') {
    return {
      disabled: !hasHandler,
      label: `Reconnect to ${peer.displayName}`,
      text: 'Reconnect',
    };
  }
  return { disabled: !hasHandler, label: `Connect to ${peer.displayName}`, text: 'Connect' };
}

export function PeerCard({
  peer,
  expanded,
  detailsId,
  onToggleDetails,
  pending = false,
  actionError,
  onConnect,
  onDisconnect,
}: PeerCardProps) {
  const isConnected = peer.connectionState === 'connected';
  const connectionHandler = isConnected ? onDisconnect : onConnect;
  const action = connectionAction(peer, pending, connectionHandler !== undefined);

  return (
    <article aria-labelledby={`${detailsId}-name`} className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 id={`${detailsId}-name`}>{peer.displayName}</h3>
        <ConnectionStatusBadge peer={peer} />
      </div>
      <p className={styles.summaryLine}>
        {deviceLabel(peer)} · {platformLabel(peer.platform)}
      </p>
      <dl className={styles.metaGrid}>
        <div>
          <dt>Availability</dt>
          <dd>{availabilityLabel(peer.availability)}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{formatTime(peer.lastSeenAt)}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <button
          aria-label={action.label}
          className={styles.actionButton}
          disabled={action.disabled}
          onClick={() => void connectionHandler?.(peer.peerId)}
          type="button"
        >
          {action.text}
        </button>
        <button
          aria-controls={detailsId}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Hide' : 'View'} details for ${peer.displayName}`}
          className={styles.detailsButton}
          onClick={() => onToggleDetails(peer.peerId)}
          type="button"
        >
          {expanded ? 'Hide details' : 'View details'}
        </button>
      </div>
      {actionError && (
        <p className={styles.actionError} role="alert">
          {actionError.message}
        </p>
      )}
    </article>
  );
}
