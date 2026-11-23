import { groupConversationId, type ChatMessage } from '#contracts/messaging.ts';
import { createMockMessengerApi } from '#mocks/index.ts';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/renderApp';

const groupId = 'group_local_crew';
const groupConversation = groupConversationId(groupId);

describe('Level 3 group UI', () => {
  it('renders seeded groups with member, preview and unread metadata', async () => {
    const api = await createMockMessengerApi();
    renderApp('/groups', api, true);

    expect(
      await screen.findByRole('link', { name: 'Open group Local Crew' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
    expect(screen.getByText('Group chat works offline too.')).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
    expect(screen.getByText(/mock groups from core/i)).toBeInTheDocument();
  });

  it('creates a group through the facade and navigates to its chat', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const createSpy = vi.spyOn(api, 'createGroup');
    renderApp('/groups', api, true);

    await user.type(await screen.findByLabelText('Group name'), 'Hack Team');
    await user.click(screen.getByRole('checkbox', { name: 'Aisha' }));
    await user.click(screen.getByRole('checkbox', { name: 'Rahul' }));
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'Hack Team',
        memberIds: ['peer_aisha', 'peer_rahul'],
      });
    });
    expect(
      await screen.findByRole('heading', { name: 'Hack Team', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 members · Local group conversation/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /back to groups/i }));

    expect(
      await screen.findByRole('link', { name: 'Open group Hack Team' }),
    ).toBeInTheDocument();
  });

  it('validates required fields and keeps unavailable peers unselectable', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const createSpy = vi.spyOn(api, 'createGroup');
    renderApp('/groups', api, true);

    await user.click(await screen.findByRole('button', { name: 'Create group' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a group name.');

    await user.type(screen.getByLabelText('Group name'), 'Weekend Hikers');
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select at least one nearby peer.',
    );
    expect(screen.getByRole('checkbox', { name: 'Sam' })).toBeDisabled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('opens a seeded group with local history and read-only member details', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    renderApp('/groups', api, true);

    await user.click(await screen.findByRole('link', { name: 'Open group Local Crew' }));

    expect(
      await screen.findByRole('heading', { name: 'Local Crew', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Group chat works offline too.')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Received message')).toHaveLength(1);

    await user.click(screen.getByText('Members and details'));

    const members = await screen.findByRole('list', { name: 'Group members' });
    expect(within(members).getByText(/Rahul/)).toBeInTheDocument();
    expect(within(members).getByText(/Owner/)).toBeInTheDocument();
    expect(screen.getByText(/read-only here/i)).toBeInTheDocument();
  });

  it('sends a group message through the facade and clears the composer', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const sendSpy = vi.spyOn(api, 'sendGroupMessage');
    renderApp(`/groups/${groupId}`, api, true);

    await screen.findByRole('heading', { name: 'Local Crew', level: 1 });
    const input = await screen.findByLabelText('Message');
    await user.type(input, 'LAN only');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(groupId, 'LAN only');
    });
    expect(await screen.findByText('LAN only')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getAllByLabelText('Sent message').at(-1)).toHaveTextContent('Sent');
  });

  it('shows a safe send failure while preserving the draft', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    let rejectSend: (reason: unknown) => void = () => {};
    const pending = new Promise<never>((_resolve, reject) => {
      rejectSend = reject;
    });
    vi.spyOn(api, 'sendGroupMessage').mockReturnValue(pending);
    renderApp(`/groups/${groupId}`, api, true);

    await screen.findByRole('heading', { name: 'Local Crew', level: 1 });
    const input = await screen.findByLabelText('Message');
    await user.type(input, 'Keep this draft');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();

    await act(async () => {
      rejectSend(new Error('socket ECONNREFUSED 192.168.1.4:7000'));
      await pending.catch(() => undefined);
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Group message could not be sent.');
    expect(alert).not.toHaveTextContent('ECONNREFUSED');
    expect(alert).not.toHaveTextContent('192.168.1.4');
    expect(input).toHaveValue('Keep this draft');
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('shows a safe group history error without breaking the chat shell', async () => {
    const api = await createMockMessengerApi();
    vi.spyOn(api, 'listGroupMessages').mockRejectedValue(
      new Error('storage EACCES /secrets'),
    );
    renderApp(`/groups/${groupId}`, api, true);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Group history could not be loaded.');
    expect(alert).not.toHaveTextContent('EACCES');
    expect(alert).not.toHaveTextContent('/secrets');
    expect(
      screen.getByRole('heading', { name: 'Local Crew', level: 1 }),
    ).toBeInTheDocument();
  });

  it('updates group chat from AppEvents without duplicating messages', async () => {
    const api = await createMockMessengerApi();
    const originalMessages = await api.listGroupMessages(groupId);
    const incoming: ChatMessage = {
      id: 'msg_group_live',
      conversationId: groupConversation,
      senderId: 'peer_aisha',
      senderName: 'Aisha',
      body: 'Live group update',
      createdAt: Date.UTC(2026, 0, 1, 9, 20, 0),
      status: 'received',
    };
    let includeIncoming = false;
    vi.spyOn(api, 'listGroupMessages').mockImplementation(async (requestedId) =>
      requestedId === groupId && includeIncoming
        ? [...originalMessages, incoming, incoming]
        : originalMessages,
    );
    renderApp(`/groups/${groupId}`, api, true);

    await screen.findByRole('heading', { name: 'Local Crew', level: 1 });
    expect(screen.queryByText('Live group update')).not.toBeInTheDocument();

    const conversation = await api.storage.conversations.get(groupConversation);
    if (conversation === undefined) throw new Error('Seeded group conversation is missing.');
    const updated = {
      ...conversation,
      updatedAt: incoming.createdAt,
      lastMessagePreview: incoming.body,
    };

    await act(async () => {
      includeIncoming = true;
      await api.storage.messages.save(incoming);
      await api.storage.conversations.save(updated);
      api.events.emit('groups.message.received', incoming);
      api.events.emit('messaging.conversation.updated', updated);
    });

    expect(await screen.findByText('Live group update')).toBeInTheDocument();
    expect(screen.getAllByText('Live group update')).toHaveLength(1);
  });

  it('refreshes the group list when a group update event arrives', async () => {
    const api = await createMockMessengerApi();
    renderApp('/groups', api, true);

    await screen.findByRole('link', { name: 'Open group Local Crew' });
    const group = await api.storage.groups.get(groupId);
    if (group === undefined) throw new Error('Seeded group is missing.');
    const renamed = { ...group, name: 'Renamed Crew' };

    await act(async () => {
      await api.storage.groups.save(renamed);
      api.events.emit('groups.group.updated', renamed);
    });

    expect(
      await screen.findByRole('link', { name: 'Open group Renamed Crew' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Open group Local Crew' }),
    ).not.toBeInTheDocument();
  });

  it('renders a recovery state for a missing group', async () => {
    const api = await createMockMessengerApi();
    renderApp('/groups/group_missing', api, true);

    expect(await screen.findByText('Group not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to groups/i })).toBeInTheDocument();
  });

  it('renders an empty state when no groups exist', async () => {
    const api = await createMockMessengerApi({ seed: false });
    renderApp('/groups', api, true);

    expect(await screen.findByText('No groups yet')).toBeInTheDocument();
  });
});
