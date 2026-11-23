import type { ErrorInfo } from '#contracts/errors.ts';
import type { ChatMessage } from '#contracts/messaging.ts';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.tsx';
import { toUiErrorInfo } from '../integration/errors.ts';
import { useMessenger } from '../integration/MessengerProvider.tsx';
import { formatTime } from '../pages/format.ts';
import {
  connectionLabel,
  deviceLabel,
  platformLabel,
} from '../peers/peerStatus.ts';
import styles from './Chat.module.css';
import { messageStatusLabel } from './messageStatus.ts';

function messageDirection(message: ChatMessage, selfId: string | undefined): 'sent' | 'received' {
  return selfId !== undefined && message.senderId === selfId ? 'sent' : 'received';
}

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const {
    state,
    error,
    conversations,
    messages,
    messageErrors,
    peers,
    identity,
    isMock,
    sendMessage,
    markConversationRead,
  } = useMessenger();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<ErrorInfo | undefined>();
  const [readError, setReadError] = useState<ErrorInfo | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = useMemo(
    () =>
      conversations.find(
        (candidate) => candidate.id === conversationId && candidate.kind === 'private',
      ),
    [conversationId, conversations],
  );
  const peer = useMemo(
    () => peers.find((candidate) => candidate.peerId === conversation?.peerId),
    [conversation?.peerId, peers],
  );
  const threadMessages = useMemo(
    () => messages.filter((message) => message.conversationId === conversationId),
    [conversationId, messages],
  );
  const messageError = conversationId === undefined ? undefined : messageErrors[conversationId];

  useEffect(() => {
    if (conversation === undefined || conversation.unreadCount === 0) return;
    let cancelled = false;

    void markConversationRead(conversation.id)
      .then(() => {
        if (!cancelled) setReadError(undefined);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setReadError(toUiErrorInfo(reason, 'Unread status could not be updated.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversation, markConversationRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [conversationId, threadMessages.length]);

  async function submitDraft() {
    const body = draft.trim();
    if (body.length === 0 || sending || conversation === undefined) return;

    setSending(true);
    setSendError(undefined);
    try {
      await sendMessage(conversation.id, body);
      setDraft('');
    } catch (reason: unknown) {
      setSendError(toUiErrorInfo(reason, 'Message could not be sent.'));
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitDraft();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitDraft();
    }
  }

  if (state === 'loading') {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.backLink} to="/chats">
            ← Back to chats
          </Link>
          <h1>Chat</h1>
        </header>
        <LoadingState title="Loading conversation" />
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.backLink} to="/chats">
            ← Back to chats
          </Link>
          <h1>Chat</h1>
        </header>
        <ErrorState message={error?.message ?? 'Conversation history could not be read.'} />
      </section>
    );
  }

  if (conversation === undefined) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.backLink} to="/chats">
            ← Back to chats
          </Link>
          <h1>Chat</h1>
        </header>
        <EmptyState title="Conversation not found">
          This conversation is no longer available in local history.
        </EmptyState>
      </section>
    );
  }

  const peerName = conversation.title;
  const identityText =
    peer === undefined
      ? 'Peer details are not available'
      : `${deviceLabel(peer)} · ${platformLabel(peer.platform)} · ${connectionLabel(peer)}`;
  const canSend = draft.trim().length > 0 && !sending;

  return (
    <section aria-labelledby="chat-heading" className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to="/chats">
          ← Back to chats
        </Link>
        <h1 id="chat-heading">Chat with {peerName}</h1>
        <p>{identityText}</p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock data from Core. No messages are being sent to another device.
        </div>
      )}
      {readError && (
        <p className={styles.error} role="alert">
          {readError.message}
        </p>
      )}

      <div
        aria-label={`Messages with ${peerName}`}
        aria-live="polite"
        className={styles.thread}
        role="log"
      >
        {messageError && (
          <p className={styles.error} role="alert">
            {messageError.message}
          </p>
        )}
        {!messageError && threadMessages.length === 0 && (
          <EmptyState title="No messages yet">Send the first message to {peerName}.</EmptyState>
        )}
        {threadMessages.length > 0 && (
          <ol className={styles.messageList}>
            {threadMessages.map((message) => {
              const direction = messageDirection(message, identity?.peerId);
              return (
                <li className={styles.messageItem} key={message.id}>
                  <article
                    aria-label={direction === 'sent' ? 'Sent message' : 'Received message'}
                    className={`${styles.message} ${direction === 'sent' ? styles.sent : styles.received}`}
                  >
                    {direction === 'received' && (
                      <span className={styles.sender}>{message.senderName}</span>
                    )}
                    <p className={styles.messageBody}>{message.body}</p>
                    <div className={styles.messageMeta}>
                      <time dateTime={new Date(message.createdAt).toISOString()}>
                        {formatTime(message.createdAt)}
                      </time>
                      <span>{messageStatusLabel(message.status)}</span>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className={styles.composerLabel} htmlFor="chat-message-input">
          Message
        </label>
        <div className={styles.composerRow}>
          <textarea
            className={styles.textarea}
            id="chat-message-input"
            onChange={(event) => {
              setDraft(event.target.value);
              if (sendError !== undefined) setSendError(undefined);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Write a message to ${peerName}…`}
            rows={2}
            value={draft}
          />
          <button className={styles.sendButton} disabled={!canSend} type="submit">
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className={styles.composerHint}>Enter sends · Shift + Enter adds a line</p>
        {sendError && (
          <p className={styles.error} role="alert">
            {sendError.message}
          </p>
        )}
      </form>
    </section>
  );
}
