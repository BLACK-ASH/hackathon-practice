import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useMessenger } from '../integration/MessengerProvider';
import styles from './DataPages.module.css';
import { formatTime } from './format';

export function ChatsPage() {
  const { state, error, conversations, isMock } = useMessenger();

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Chats</h1>
        <p>Locally stored conversation previews from the UI facade.</p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock data from Core. No messages are being sent to another device.
        </div>
      )}

      {state === 'loading' && <LoadingState />}
      {state === 'error' && (
        <ErrorState message={error?.message ?? 'Conversation history could not be read.'} />
      )}
      {state === 'ready' && conversations.length === 0 && (
        <EmptyState title="No conversations yet">Saved chats will appear here.</EmptyState>
      )}
      {state === 'ready' && conversations.length > 0 && (
        <ul className={styles.list}>
          {conversations.map((conversation) => (
            <li className={styles.card} key={conversation.id}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{conversation.title}</h2>
                <span
                  className={`${styles.badge} ${conversation.unreadCount === 0 ? styles.badgeMuted : ''}`}
                >
                  {conversation.unreadCount === 0
                    ? conversation.kind === 'group'
                      ? 'Group'
                      : 'Private'
                    : `${conversation.unreadCount} unread`}
                </span>
              </div>
              <p className={styles.preview}>
                {conversation.lastMessagePreview ?? 'No messages in this conversation yet.'}
              </p>
              <p className={styles.meta}>
                Updated {formatTime(conversation.updatedAt)} · stored locally
                {isMock ? ' in the mock session' : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
