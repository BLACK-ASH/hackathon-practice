import type { ChatMessage, Conversation } from '#contracts/messaging.ts';
import { createMockMessengerApi } from '#mocks/index.ts';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/renderApp';

const emptyConversation: Conversation = {
  id: 'dm:peer_empty',
  kind: 'private',
  peerId: 'peer_empty',
  title: 'Priya',
  createdAt: Date.UTC(2026, 0, 1, 9, 0, 0),
  updatedAt: Date.UTC(2026, 0, 1, 9, 0, 0),
  unreadCount: 0,
};

async function openAishaChat(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('link', { name: 'Open chat with Aisha' }));
  return screen.findByRole('heading', { name: 'Chat with Aisha', level: 1 });
}

describe('Level 2 chat UI', () => {
  it('renders private inbox entries with previews, identity and unread state', async () => {
    const api = await createMockMessengerApi();
    renderApp('/chats', api, true);

    expect(
      await screen.findByRole('link', { name: 'Open chat with Aisha' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Open chat with Local Crew' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/perfect\. group chat and files too\?/i)).toBeInTheDocument();
    expect(screen.getByText('Pixel 8 · Android')).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
    expect(screen.getByText(/no messages are being sent/i)).toBeInTheDocument();
  });

  it('opens a conversation and renders local history with direction and status', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    renderApp('/chats', api, true);

    await openAishaChat(user);

    expect(screen.getByText('Hey! Are you on the same Wi-Fi?')).toBeInTheDocument();
    expect(screen.getByText('Yes — found you nearby.')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Received message')).toHaveLength(2);
    expect(screen.getByLabelText('Sent message')).toHaveTextContent('Delivered');
    expect(screen.getByText(/Pixel 8 · Android/)).toBeInTheDocument();
  });

  it('sends through the facade, clears the composer and renders the new message', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const sendSpy = vi.spyOn(api, 'sendMessage');
    renderApp('/chats', api, true);

    await openAishaChat(user);
    const input = await screen.findByLabelText('Message');
    await user.type(input, 'See you on LAN');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith('dm:peer_aisha', 'See you on LAN');
    });
    expect(await screen.findByText('See you on LAN')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getAllByLabelText('Sent message').at(-1)).toHaveTextContent('Sent');
  });

  it('supports Enter to send and Shift+Enter for a newline', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const sendSpy = vi.spyOn(api, 'sendMessage');
    renderApp('/chats', api, true);

    await openAishaChat(user);
    const input = await screen.findByLabelText('Message');
    await user.type(input, 'Short message{Enter}');

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith('dm:peer_aisha', 'Short message');
    });
    await waitFor(() => expect(input).toHaveValue(''));

    await user.type(input, 'First line{Shift>}{Enter}{/Shift}Second line');

    expect(input).toHaveValue('First line\nSecond line');
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const sendSpy = vi.spyOn(api, 'sendMessage');
    renderApp('/chats', api, true);

    await openAishaChat(user);
    const input = await screen.findByLabelText('Message');

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    await user.type(input, '   ');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    await user.clear(input);
    input.focus();
    await user.keyboard('{Enter}');

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('shows pending and safe failure state while preserving the draft', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    let rejectSend: (reason: unknown) => void = () => {};
    const pending = new Promise<never>((_resolve, reject) => {
      rejectSend = reject;
    });
    vi.spyOn(api, 'sendMessage').mockReturnValue(pending);
    renderApp('/chats', api, true);

    await openAishaChat(user);
    const input = await screen.findByLabelText('Message');
    await user.type(input, 'Keep this draft');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();

    await act(async () => {
      rejectSend(new Error('connect ECONNREFUSED 192.168.1.4:7000'));
      await pending.catch(() => undefined);
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Message could not be sent.');
    expect(alert).not.toHaveTextContent('ECONNREFUSED');
    expect(alert).not.toHaveTextContent('192.168.1.4');
    expect(input).toHaveValue('Keep this draft');
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('shows a safe history error without breaking the inbox', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    vi.spyOn(api, 'listMessages').mockRejectedValue(new Error('storage EACCES /secrets'));
    renderApp('/chats', api, true);

    expect(
      await screen.findByRole('link', { name: 'Open chat with Aisha' }),
    ).toBeInTheDocument();
    await openAishaChat(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Message history could not be loaded.');
    expect(alert).not.toHaveTextContent('EACCES');
    expect(alert).not.toHaveTextContent('/secrets');
  });

  it('updates inbox and thread from AppEvents without duplicating messages', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const originalMessages = new Map<string, readonly ChatMessage[]>();
    for (const conversation of await api.listConversations()) {
      originalMessages.set(conversation.id, await api.listMessages(conversation.id));
    }

    const incoming: ChatMessage = {
      id: 'msg_live',
      conversationId: 'dm:peer_aisha',
      senderId: 'peer_aisha',
      senderName: 'Aisha',
      body: 'Live message from Aisha',
      createdAt: Date.UTC(2026, 0, 1, 9, 10, 0),
      status: 'received',
    };
    vi.spyOn(api, 'listMessages').mockImplementation(async (conversationId) =>
      conversationId === incoming.conversationId
        ? [...(originalMessages.get(conversationId) ?? []), incoming, incoming]
        : (originalMessages.get(conversationId) ?? []),
    );

    renderApp('/chats', api, true);
    await screen.findByRole('link', { name: 'Open chat with Aisha' });

    const conversation = await api.storage.conversations.get(incoming.conversationId);
    if (conversation === undefined) throw new Error('Seeded conversation is missing.');
    const updated: Conversation = {
      ...conversation,
      updatedAt: incoming.createdAt,
      unreadCount: conversation.unreadCount + 1,
      lastMessagePreview: incoming.body,
    };

    await act(async () => {
      await api.storage.messages.save(incoming);
      await api.storage.conversations.save(updated);
      api.events.emit('messaging.message.received', incoming);
      api.events.emit('messaging.conversation.updated', updated);
    });

    expect(await screen.findByText('Live message from Aisha')).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();

    await openAishaChat(user);

    expect(screen.getAllByText('Live message from Aisha')).toHaveLength(1);

    await user.click(screen.getByRole('link', { name: /back to chats/i }));
    await waitFor(() => expect(screen.getByText('Private')).toBeInTheDocument());
  });

  it('shows a loading state while message history is pending', async () => {
    const api = await createMockMessengerApi();
    let resolveMessages: (value: readonly ChatMessage[]) => void = () => {};
    const pending = new Promise<readonly ChatMessage[]>((resolve) => {
      resolveMessages = resolve;
    });
    vi.spyOn(api, 'listMessages').mockImplementation(async (conversationId) =>
      conversationId === 'dm:peer_aisha' ? pending : [],
    );

    renderApp('/chats/dm%3Apeer_aisha', api, true);

    expect(await screen.findByText('Loading conversation')).toBeInTheDocument();

    await act(async () => {
      resolveMessages([]);
    });

    expect(
      await screen.findByRole('heading', { name: 'Chat with Aisha', level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders an empty thread for a conversation with no stored messages', async () => {
    const api = await createMockMessengerApi({ seed: false });
    await api.storage.conversations.save(emptyConversation);

    renderApp('/chats/dm%3Apeer_empty', api, true);

    expect(
      await screen.findByRole('heading', { name: 'Chat with Priya', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('renders a recovery state for an unknown conversation', async () => {
    const api = await createMockMessengerApi();
    renderApp('/chats/dm%3Amissing', api, true);

    expect(await screen.findByText('Conversation not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to chats/i })).toBeInTheDocument();
  });
});
