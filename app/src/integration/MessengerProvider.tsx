import { createMockMessengerApi } from '#mocks/index.ts';
import { AppError } from '#core/index.ts';
import type { MessengerApi } from '#contracts/app.ts';
import type { ErrorInfo } from '#contracts/errors.ts';
import type { CreateGroupInput, GroupInfo } from '#contracts/groups.ts';
import type { ModuleHealthReport } from '#contracts/lifecycle.ts';
import type { ChatMessage, Conversation } from '#contracts/messaging.ts';
import type { PeerIdentity } from '#contracts/identity.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import type { FileTransferRecord } from '#contracts/files.ts';
import type { ConversationId, GroupId, PeerId } from '#types/ids.ts';
import { toUiErrorInfo } from './errors.ts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

export type MessengerLoadState = 'loading' | 'ready' | 'error';

export interface MessengerSnapshot {
  readonly identity: PeerIdentity | undefined;
  readonly peers: readonly PeerInfo[];
  readonly conversations: readonly Conversation[];
  readonly messages: readonly ChatMessage[];
  readonly messageErrors: Readonly<Partial<Record<ConversationId, ErrorInfo>>>;
  readonly groups: readonly GroupInfo[];
  readonly groupMessages: readonly ChatMessage[];
  readonly groupMessageErrors: Readonly<Partial<Record<GroupId, ErrorInfo>>>;
  readonly transfers: readonly FileTransferRecord[];
  readonly health: readonly ModuleHealthReport[];
}

interface MessengerContextValue extends MessengerSnapshot {
  readonly state: MessengerLoadState;
  readonly error: ErrorInfo | undefined;
  readonly isMock: boolean;
  readonly pendingPeerIds: readonly PeerId[];
  readonly connectionErrors: Readonly<Partial<Record<PeerId, ErrorInfo>>>;
  reload(): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
  connectToPeer(peerId: PeerId): Promise<void>;
  disconnectFromPeer(peerId: PeerId): Promise<void>;
  sendMessage(conversationId: ConversationId, body: string): Promise<void>;
  markConversationRead(conversationId: ConversationId): Promise<void>;
  createGroup(input: CreateGroupInput): Promise<GroupInfo>;
  sendGroupMessage(groupId: GroupId, body: string): Promise<void>;
}

const emptySnapshot: MessengerSnapshot = {
  identity: undefined,
  peers: [],
  conversations: [],
  messages: [],
  messageErrors: {},
  groups: [],
  groupMessages: [],
  groupMessageErrors: {},
  transfers: [],
  health: [],
};

function mergeMessages(groups: readonly (readonly ChatMessage[])[]): readonly ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const group of groups) {
    for (const message of group) {
      byId.set(message.id, message);
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
}

const MessengerContext = createContext<MessengerContextValue | undefined>(undefined);

export interface MessengerProviderProps extends PropsWithChildren {
  readonly api?: MessengerApi;
  readonly mock?: boolean;
}

export function MessengerProvider({ children, api, mock }: MessengerProviderProps) {
  const [activeApi, setActiveApi] = useState<MessengerApi | undefined>(api);
  const [state, setState] = useState<MessengerLoadState>('loading');
  const [snapshot, setSnapshot] = useState<MessengerSnapshot>(emptySnapshot);
  const [error, setError] = useState<ErrorInfo | undefined>(undefined);
  const [pendingPeerIds, setPendingPeerIds] = useState<readonly PeerId[]>([]);
  const [connectionErrors, setConnectionErrors] = useState<
    Readonly<Partial<Record<PeerId, ErrorInfo>>>
  >({});
  const isMock = api === undefined ? true : mock === true;

  useEffect(() => {
    setPendingPeerIds([]);
    setConnectionErrors({});
    if (api) {
      setActiveApi(api);
      return;
    }

    let cancelled = false;
    createMockMessengerApi()
      .then((created) => {
        if (!cancelled) setActiveApi(created);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(toUiErrorInfo(reason));
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [api]);

  const reload = useCallback(async () => {
    if (!activeApi) return;

    setState((current) => (current === 'ready' ? current : 'loading'));
    try {
      const [identity, conversations, groups, transfers] = await Promise.all([
        activeApi.getIdentity(),
        activeApi.listConversations(),
        activeApi.listGroups(),
        activeApi.listTransfers(),
      ]);
      const privateConversations = conversations.filter(
        (conversation) => conversation.kind === 'private',
      );
      const messageErrors: Partial<Record<ConversationId, ErrorInfo>> = {};
      const groupMessageErrors: Partial<Record<GroupId, ErrorInfo>> = {};
      const [messageLists, groupMessageLists] = await Promise.all([
        Promise.all(
          privateConversations.map(async (conversation) => {
            try {
              return await activeApi.listMessages(conversation.id);
            } catch (reason: unknown) {
              messageErrors[conversation.id] = toUiErrorInfo(
                reason,
                'Message history could not be loaded.',
              );
              return [];
            }
          }),
        ),
        Promise.all(
          groups.map(async (group) => {
            try {
              return await activeApi.listGroupMessages(group.id);
            } catch (reason: unknown) {
              groupMessageErrors[group.id] = toUiErrorInfo(
                reason,
                'Group history could not be loaded.',
              );
              return [];
            }
          }),
        ),
      ]);

      setSnapshot({
        identity,
        peers: activeApi.listPeers(),
        conversations,
        messages: mergeMessages(messageLists),
        messageErrors,
        groups,
        groupMessages: mergeMessages(groupMessageLists),
        groupMessageErrors,
        transfers,
        health: activeApi.getModuleHealth(),
      });
      setError(undefined);
      setState('ready');
    } catch (reason: unknown) {
      setError(toUiErrorInfo(reason));
      setState('error');
    }
  }, [activeApi]);

  useEffect(() => {
    if (activeApi) void reload();
  }, [activeApi, reload]);

  useEffect(() => {
    if (!activeApi) return;

    const refresh = () => {
      void reload();
    };
    const subscriptions = [
      activeApi.events.on('core.module.health', refresh),
      activeApi.events.on('identity.changed', refresh),
      activeApi.events.on('network.peer.discovered', refresh),
      activeApi.events.on('network.peer.updated', refresh),
      activeApi.events.on('network.peer.lost', refresh),
      activeApi.events.on('network.connection.changed', refresh),
      activeApi.events.on('messaging.conversation.updated', refresh),
      activeApi.events.on('messaging.message.received', refresh),
      activeApi.events.on('messaging.message.updated', refresh),
      activeApi.events.on('groups.group.updated', refresh),
      activeApi.events.on('groups.group.removed', refresh),
      activeApi.events.on('groups.message.received', refresh),
      activeApi.events.on('files.transfer.requested', refresh),
      activeApi.events.on('files.transfer.updated', refresh),
      activeApi.events.on('files.transfer.progress', refresh),
      activeApi.events.on('storage.error', refresh),
    ];

    return () => {
      for (const subscription of subscriptions) subscription.unsubscribe();
    };
  }, [activeApi, reload]);

  const setPeerPending = useCallback((peerId: PeerId, pending: boolean) => {
    setPendingPeerIds((current) =>
      pending
        ? current.includes(peerId)
          ? current
          : [...current, peerId]
        : current.filter((id) => id !== peerId),
    );
  }, []);

  const setPeerError = useCallback(
    (peerId: PeerId, error: ErrorInfo | undefined) => {
      setConnectionErrors((current) => {
        const next: Partial<Record<string, ErrorInfo>> = { ...current };
        if (error === undefined) delete next[peerId];
        else next[peerId] = error;
        return next;
      });
    },
    [],
  );

  const runPeerAction = useCallback(
    async (
      peerId: PeerId,
      action: (facade: MessengerApi) => Promise<unknown>,
      fallbackMessage: string,
    ) => {
      if (!activeApi) {
        setPeerError(
          peerId,
          toUiErrorInfo(
            new AppError('unavailable', 'Messenger service is not ready.'),
            fallbackMessage,
          ),
        );
        return;
      }

      setPeerPending(peerId, true);
      setPeerError(peerId, undefined);
      try {
        await action(activeApi);
        await reload();
      } catch (reason: unknown) {
        setPeerError(peerId, toUiErrorInfo(reason, fallbackMessage));
      } finally {
        setPeerPending(peerId, false);
      }
    },
    [activeApi, reload, setPeerError, setPeerPending],
  );

  const connectToPeer = useCallback(
    (peerId: PeerId) =>
      runPeerAction(peerId, (facade) => facade.connect(peerId), 'Connection could not be updated.'),
    [runPeerAction],
  );

  const disconnectFromPeer = useCallback(
    (peerId: PeerId) =>
      runPeerAction(
        peerId,
        (facade) => facade.disconnect(peerId),
        'Connection could not be updated.',
      ),
    [runPeerAction],
  );

  const sendMessage = useCallback(
    async (conversationId: ConversationId, body: string) => {
      if (!activeApi) {
        throw new AppError('unavailable', 'Messenger service is not ready.');
      }
      await activeApi.sendMessage(conversationId, body);
      await reload();
    },
    [activeApi, reload],
  );

  const markConversationRead = useCallback(
    async (conversationId: ConversationId) => {
      if (!activeApi) {
        throw new AppError('unavailable', 'Messenger service is not ready.');
      }
      await activeApi.markConversationRead(conversationId);
      await reload();
    },
    [activeApi, reload],
  );

  const createGroup = useCallback(
    async (input: CreateGroupInput) => {
      if (!activeApi) {
        throw new AppError('unavailable', 'Messenger service is not ready.');
      }
      const group = await activeApi.createGroup(input);
      await reload();
      return group;
    },
    [activeApi, reload],
  );

  const sendGroupMessage = useCallback(
    async (groupId: GroupId, body: string) => {
      if (!activeApi) {
        throw new AppError('unavailable', 'Messenger service is not ready.');
      }
      await activeApi.sendGroupMessage(groupId, body);
      await reload();
    },
    [activeApi, reload],
  );

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!activeApi) {
        throw new AppError('unavailable', 'Messenger service is not ready.');
      }
      await activeApi.updateDisplayName(displayName);
      await reload();
    },
    [activeApi, reload],
  );

  return (
    <MessengerContext.Provider
      value={{
        ...snapshot,
        state,
        error,
        isMock,
        pendingPeerIds,
        connectionErrors,
        reload,
        updateDisplayName,
        connectToPeer,
        disconnectFromPeer,
        sendMessage,
        markConversationRead,
        createGroup,
        sendGroupMessage,
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
}

export function useMessenger(): MessengerContextValue {
  const value = useContext(MessengerContext);
  if (!value) {
    throw new Error('useMessenger must be used inside MessengerProvider.');
  }
  return value;
}
