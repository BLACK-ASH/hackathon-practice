import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useMessenger } from '../integration/MessengerProvider';
import type { TransferState } from '#contracts/files.ts';
import styles from './DataPages.module.css';
import { formatBytes, formatTime } from './format';

const transferLabels: Record<TransferState, string> = {
  pending: 'Waiting',
  active: 'In progress',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function TransfersPage() {
  const { state, error, transfers, isMock } = useMessenger();

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>File Transfers</h1>
        <p>Local transfer records from the UI facade.</p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock transfers from Core. No files are being sent, received, or opened.
        </div>
      )}

      {state === 'loading' && <LoadingState />}
      {state === 'error' && (
        <ErrorState message={error?.message ?? 'Transfer history could not be read.'} />
      )}
      {state === 'ready' && transfers.length === 0 && (
        <EmptyState title="No transfers yet">File activity will appear here.</EmptyState>
      )}
      {state === 'ready' && transfers.length > 0 && (
        <ul className={styles.list}>
          {transfers.map((transfer) => (
            <li className={styles.card} key={transfer.id}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{transfer.fileName}</h2>
                <span
                  className={`${styles.badge} ${transfer.state === 'completed' ? '' : styles.badgeMuted}`}
                >
                  {transferLabels[transfer.state]}
                </span>
              </div>
              <p className={styles.meta}>
                {transfer.direction === 'incoming' ? 'Received from' : 'Sent to'} a nearby device ·{' '}
                {formatBytes(transfer.size)} · {formatTime(transfer.updatedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
