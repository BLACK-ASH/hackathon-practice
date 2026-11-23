import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useMessenger } from '../integration/MessengerProvider';
import styles from './DataPages.module.css';
import { formatTime } from './format';

export function GroupsPage() {
  const { state, error, groups, isMock } = useMessenger();

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Groups</h1>
        <p>Local group metadata from the UI facade.</p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock groups from Core. Creating or messaging groups is not implemented yet.
        </div>
      )}

      {state === 'loading' && <LoadingState />}
      {state === 'error' && (
        <ErrorState message={error?.message ?? 'Groups could not be read.'} />
      )}
      {state === 'ready' && groups.length === 0 && (
        <EmptyState title="No groups yet">Synced groups will appear here.</EmptyState>
      )}
      {state === 'ready' && groups.length > 0 && (
        <ul className={styles.list}>
          {groups.map((group) => (
            <li className={styles.card} key={group.id}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{group.name}</h2>
                <span className={styles.badge}>{group.members.length} members</span>
              </div>
              <p className={styles.preview}>
                {group.members.map((member) => member.displayName).join(', ')}
              </p>
              <p className={styles.meta}>Updated {formatTime(group.updatedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
