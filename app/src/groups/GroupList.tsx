import type { ErrorInfo } from '#contracts/errors.ts';
import type { GroupInfo } from '#contracts/groups.ts';
import type { Conversation } from '#contracts/messaging.ts';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.tsx';
import type { MessengerLoadState } from '../integration/MessengerProvider.tsx';
import { formatTime } from '../pages/format.ts';
import { groupPath } from './groupPath.ts';
import styles from './Group.module.css';

interface GroupListProps {
  readonly conversations: readonly Conversation[];
  readonly error: ErrorInfo | undefined;
  readonly groups: readonly GroupInfo[];
  readonly state: MessengerLoadState;
}

export function GroupList({ conversations, error, groups, state }: GroupListProps) {
  if (state === 'loading') return <LoadingState title="Loading groups" />;
  if (state === 'error') {
    return <ErrorState message={error?.message ?? 'Groups could not be read.'} />;
  }
  if (groups.length === 0) {
    return <EmptyState title="No groups yet">Create a group to start a local conversation.</EmptyState>;
  }

  return (
    <ul className={styles.list}>
      {groups.map((group) => {
        const conversation = conversations.find(
          (candidate) => candidate.kind === 'group' && candidate.groupId === group.id,
        );
        const preview =
          conversation?.lastMessagePreview ??
          group.members.map((member) => member.displayName).join(', ');
        const timestamp = conversation?.updatedAt ?? group.updatedAt;

        return (
          <li className={styles.card} key={group.id}>
            <Link aria-label={`Open group ${group.name}`} className={styles.cardLink} to={groupPath(group.id)}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{group.name}</h2>
                <div className={styles.badgeRow}>
                  {(conversation?.unreadCount ?? 0) > 0 && (
                    <span className={styles.unread}>
                      {conversation?.unreadCount} unread
                    </span>
                  )}
                  <span className={styles.badge}>{group.members.length} members</span>
                </div>
              </div>
              <p className={styles.preview}>{preview}</p>
              <p className={styles.meta}>
                Updated{' '}
                <time dateTime={new Date(timestamp).toISOString()}>
                  {formatTime(timestamp)}
                </time>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
