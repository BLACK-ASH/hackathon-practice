import { CreateGroupForm } from '../groups/CreateGroupForm.tsx';
import { GroupList } from '../groups/GroupList.tsx';
import { useMessenger } from '../integration/MessengerProvider.tsx';
import styles from './DataPages.module.css';

export function GroupsPage() {
  const { conversations, error, groups, isMock, state } = useMessenger();

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Groups</h1>
        <p>Create local groups and keep every conversation on this device.</p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock groups from Core. Creating and messaging groups use the mock facade; no data leaves
          this device.
        </div>
      )}

      <CreateGroupForm />
      <GroupList conversations={conversations} error={error} groups={groups} state={state} />
    </section>
  );
}
