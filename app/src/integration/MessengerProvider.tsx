import { createMockMessengerApi } from '#mocks/index.ts';
import { AppError } from '#core/index.ts';
import type { MessengerApi } from '#contracts/app.ts';
import type { ErrorInfo } from '#contracts/errors.ts';
import type { GroupInfo } from '#contracts/groups.ts';
import type { ModuleHealthReport } from '#contracts/lifecycle.ts';
import type { Conversation } from '#contracts/messaging.ts';
import type { PeerIdentity } from '#contracts/identity.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import type { FileTransferRecord } from '#contracts/files.ts';
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
  readonly groups: readonly GroupInfo[];
  readonly transfers: readonly FileTransferRecord[];
  readonly health: readonly ModuleHealthReport[];
}

interface MessengerContextValue extends MessengerSnapshot {
  readonly state: MessengerLoadState;
  readonly error: ErrorInfo | undefined;
  readonly isMock: boolean;
  reload(): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
}

const emptySnapshot: MessengerSnapshot = {
  identity: undefined,
  peers: [],
  conversations: [],
  groups: [],
  transfers: [],
  health: [],
};

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
  const isMock = api === undefined ? true : mock === true;

  useEffect(() => {
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

      setSnapshot({
        identity,
        peers: activeApi.listPeers(),
        conversations,
        groups,
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
        reload,
        updateDisplayName,
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
