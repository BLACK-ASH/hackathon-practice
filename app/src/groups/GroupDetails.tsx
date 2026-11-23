import type { PeerIdentity } from '#contracts/identity.ts';
import type { GroupInfo, GroupRole } from '#contracts/groups.ts';
import styles from './Group.module.css';

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function formatDate(timestamp: number): string {
  return DATE_FORMAT.format(new Date(timestamp));
}

function roleLabel(role: GroupRole): string {
  return role === 'owner' ? 'Owner' : 'Member';
}

interface GroupDetailsProps {
  readonly group: GroupInfo;
  readonly identity: PeerIdentity | undefined;
}

export function GroupDetails({ group, identity }: GroupDetailsProps) {
  const owner = group.members.find((member) => member.role === 'owner');

  return (
    <details className={styles.details}>
      <summary className={styles.detailsSummary}>Members and details</summary>
      <div className={styles.detailsBody}>
        <dl className={styles.detailsGrid}>
          <div>
            <dt>Group name</dt>
            <dd>{group.name}</dd>
          </div>
          <div>
            <dt>Created by</dt>
            <dd>{owner?.displayName ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(group.createdAt)}</dd>
          </div>
          <div>
            <dt>Members</dt>
            <dd>{group.members.length}</dd>
          </div>
        </dl>
        <h3 className={styles.detailsSubheading}>Member list</h3>
        <ul aria-label="Group members" className={styles.memberList}>
          {group.members.map((member) => (
            <li className={styles.memberItem} key={member.peerId}>
              <span className={styles.memberName}>
                {member.displayName}
                {member.peerId === identity?.peerId ? ' (you)' : ''}
              </span>
              <span className={styles.memberMeta}>
                {roleLabel(member.role)} · Joined {formatDate(member.joinedAt)}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.readOnly}>Group name and membership are read-only here.</p>
      </div>
    </details>
  );
}
