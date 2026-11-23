import type { ErrorInfo } from '#contracts/errors.ts';
import { groupConversationId } from '#contracts/messaging.ts';
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
import { messageStatusLabel } from '../chat/messageStatus.ts';
import chatStyles from '../chat/Chat.module.css';
import { toUiErrorInfo } from '../integration/errors.ts';
import { useMessenger } from '../integration/MessengerProvider.tsx';
import { formatTime } from '../pages/format.ts';
import { GroupDetails } from './GroupDetails.tsx';
import styles from './Group.module.css';

function messageDirection(message: ChatMessage, selfId: string | undefined): 'sent' | 'received' {
  return selfId !== undefined && message.senderId === selfId ? 'sent' : 'received';
}

export function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const {
    conversations,
    error,
    groupMessageErrors,
    groupMessages,
    groups,
    identity,
    isMock,
    markConversationRead,
    sendGroupMessage,
    state,
  } = useMessenger();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<ErrorInfo | undefined>();
  const [readError, setReadError] = useState<ErrorInfo | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const group = useMemo(
    () => groups.find((candidate) => candidate.id === groupId),
    [groupId, groups],
  );
  const conversation = useMemo(
    () =>
      conversations.find(
        (candidate) => candidate.kind === 'group' && candidate.groupId === groupId,
      ),
    [groupId, conversations],
  );
  const messageError = groupId === undefined ? undefined : groupMessageErrors[groupId];
  const threadMessages = useMemo(() => {
    if (groupId === undefined) return [];
    const conversationId = groupConversationId(groupId);
    return groupMessages.filter((message) => message.conversationId === conversationId);
  }, [groupId, groupMessages]);

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
  }, [groupId, threadMessages.length]);

  async function submitDraft() {
    const body = draft.trim();
    if (body.length === 0 || sending || group === undefined) return;

    setSending(true);
    setSendError(undefined);
    try {
      await sendGroupMessage(group.id, body);
      setDraft('');
    } catch (reason: unknown) {
      setSendError(toUiErrorInfo(reason, 'Group message could not be sent.'));
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
          <Link className={styles.backLink} to="/groups">
            ← Back to groups
          </Link>
          <h1>Group</h1>
        </header>
        <LoadingState title="Loading group conversation" />
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.backLink} to="/groups">
            ← Back to groups
          </Link>
          <h1>Group</h1>
        </header>
        <ErrorState message={error?.message ?? 'Group conversation could not be read.'} />
      </section>
    );
  }

  if (group === undefined) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.backLink} to="/groups">
            ← Back to groups
          </Link>
          <h1>Group</h1>
        </header>
        <EmptyState title="Group not found">
          This group is no longer available in local history.
        </EmptyState>
      </section>
    );
  }

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <section aria-labelledby="group-chat-heading" className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to="/groups">
          ← Back to groups
        </Link>
        <h1 id="group-chat-heading">{group.name}</h1>
        <p>{group.members.length} members · Local group conversation</p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock groups from Core. No messages are being sent to another device.
        </div>
      )}
      {readError && (
        <p className={styles.error} role="alert">
          {readError.message}
        </p>
      )}

      <div
        aria-label={`Messages in ${group.name}`}
        aria-live="polite"
        className={chatStyles.thread}
        role="log"
      >
        {messageError && (
          <p className={styles.error} role="alert">
            {messageError.message}
          </p>
        )}
        {!messageError && threadMessages.length === 0 && (
          <EmptyState title="No messages yet">Send the first message to {group.name}.</EmptyState>
        )}
        {threadMessages.length > 0 && (
          <ol className={chatStyles.messageList}>
            {threadMessages.map((message) => {
              const direction = messageDirection(message, identity?.peerId);
              return (
                <li className={chatStyles.messageItem} key={message.id}>
                  <article
                    aria-label={direction === 'sent' ? 'Sent message' : 'Received message'}
                    className={`${chatStyles.message} ${direction === 'sent' ? chatStyles.sent : chatStyles.received}`}
                  >
                    {direction === 'received' && (
                      <span className={chatStyles.sender}>{message.senderName}</span>
                    )}
                    <p className={chatStyles.messageBody}>{message.body}</p>
                    <div className={chatStyles.messageMeta}>
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

      <GroupDetails group={group} identity={identity} />

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className={styles.composerLabel} htmlFor="group-message-input">
          Message
        </label>
        <div className={styles.composerRow}>
          <textarea
            className={styles.textarea}
            id="group-message-input"
            onChange={(event) => {
              setDraft(event.target.value);
              if (sendError !== undefined) setSendError(undefined);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Write a message to ${group.name}…`}
            rows={2}
            value={draft}
          />
          <button className={styles.button} disabled={!canSend} type="submit">
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
