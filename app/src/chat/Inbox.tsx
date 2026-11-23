import type { ErrorInfo } from '#contracts/errors.ts';
import type { Conversation } from '#contracts/messaging.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import type { ConversationId } from '#types/ids.ts';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.tsx';
import type { MessengerLoadState } from '../integration/MessengerProvider.tsx';
import { formatTime } from '../pages/format.ts';
import { deviceLabel, platformLabel } from '../peers/peerStatus.ts';
import styles from './Chat.module.css';

export interface InboxProps {
  readonly state: MessengerLoadState;
  readonly error: ErrorInfo | undefined;
  readonly conversations: readonly Conversation[];
  readonly peers: readonly PeerInfo[];
  readonly isMock: boolean;
}

export function conversationPath(conversationId: ConversationId): string {
  return `/chats/${encodeURIComponent(conversationId)}`;
}

function compareConversations(a: Conversation, b: Conversation): number {
  return (
    b.updatedAt - a.updatedAt ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  );
}

function identityLine(peer: PeerInfo | undefined, title: string): string {
  if (peer === undefined) return `Private conversation with ${title}`;
  return `${deviceLabel(peer)} · ${platformLabel(peer.platform)}`;
}

export function Inbox({ state, error, conversations, peers, isMock }: InboxProps) {
  const peerById = useMemo(
    () => new Map(peers.map((peer) => [peer.peerId, peer] as const)),
    [peers],
  );
  const privateConversations = useMemo(
    () => conversations.filter((conversation) => conversation.kind === 'private').sort(compareConversations),
    [conversations],
  );

  return (
    <section aria-labelledby="chat-inbox-heading" className={styles.page}>
      <header className={styles.header}>
        <h1 id="chat-inbox-heading">Chats</h1>
        <p>Private conversations stored on this device.</p>
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
      {state === 'ready' && privateConversations.length === 0 && (
        <EmptyState title="No conversations yet">
          Start a chat from a nearby device to see it here.
        </EmptyState>
      )}
      {state === 'ready' && privateConversations.length > 0 && (
        <ul className={styles.list}>
          {privateConversations.map((conversation) => {
            const peer = conversation.peerId === undefined ? undefined : peerById.get(conversation.peerId);
            const unreadLabel =
              conversation.unreadCount === 0
                ? 'Private'
                : `${conversation.unreadCount > 99 ? '99+' : conversation.unreadCount} unread`;

            return (
              <li className={styles.item} key={conversation.id}>
                <Link
                  aria-label={`Open chat with ${conversation.title}`}
                  className={styles.conversationLink}
                  to={conversationPath(conversation.id)}
                >
                  <span aria-hidden="true" className={styles.avatar}>
                    {conversation.title.charAt(0).toUpperCase()}
                  </span>
                  <div className={styles.conversationBody}>
                    <div className={styles.conversationHeader}>
                      <h2 className={styles.conversationTitle}>{conversation.title}</h2>
                      <time
                        className={styles.conversationTime}
                        dateTime={new Date(conversation.updatedAt).toISOString()}
                      >
                        {formatTime(conversation.updatedAt)}
                      </time>
                    </div>
                    <span className={styles.identity}>{identityLine(peer, conversation.title)}</span>
                    <p className={styles.preview}>
                      {conversation.lastMessagePreview ?? 'No messages in this conversation yet.'}
                    </p>
                  </div>
                  <span
                    className={`${styles.badge} ${conversation.unreadCount === 0 ? styles.badgeMuted : ''}`}
                  >
                    {unreadLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
