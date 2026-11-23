import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppError } from '#core/index.ts';
import { createMockMessengerApi } from '#mocks/index.ts';
import type { Conversation } from '#contracts/messaging.ts';
import { renderApp } from '../test/renderApp';

describe('Core-backed UI integration', () => {
  it('renders peer status from the Core mock through MessengerApi', async () => {
    const api = await createMockMessengerApi();
    renderApp('/nearby', api, true);

    expect(await screen.findByRole('heading', { name: 'Aisha' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Sam' })).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/no live discovery/i)).toBeInTheDocument();
  });

  it('renders seeded conversation previews from the Core mock', async () => {
    const api = await createMockMessengerApi();
    renderApp('/chats', api, true);

    expect(await screen.findByRole('heading', { name: 'Aisha' })).toBeInTheDocument();
    expect(screen.getByText(/perfect\. group chat and files too\?/i)).toBeInTheDocument();
    expect(screen.getByText(/no messages are being sent/i)).toBeInTheDocument();
  });

  it('shows a loading state while a Core facade request is pending', async () => {
    const api = await createMockMessengerApi();
    let resolveConversations: (value: readonly Conversation[]) => void = () => {};
    const pending = new Promise<readonly Conversation[]>((resolve) => {
      resolveConversations = resolve;
    });
    const spy = vi.spyOn(api, 'listConversations').mockImplementation(() => pending);

    renderApp('/chats', api, true);

    expect(await screen.findByText('Loading mock data')).toBeInTheDocument();
    resolveConversations([]);
    expect(await screen.findByText('No conversations yet')).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
  });

  it('shows a safe error message when the Core facade fails', async () => {
    const api = await createMockMessengerApi();
    vi.spyOn(api, 'listConversations').mockRejectedValue(
      new AppError('io', 'Conversation history is unavailable.'),
    );

    renderApp('/chats', api, true);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Conversation history is unavailable.');
    expect(alert).not.toHaveTextContent('socket');
  });

  it('hides raw error details from unknown failures', async () => {
    const api = await createMockMessengerApi();
    vi.spyOn(api, 'listConversations').mockRejectedValue(
      new Error('connect ECONNREFUSED 192.168.1.4:7000'),
    );

    renderApp('/chats', api, true);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This section could not be loaded.');
    expect(alert).not.toHaveTextContent('ECONNREFUSED');
    expect(alert).not.toHaveTextContent('192.168.1.4');
  });

  it('refreshes on Core events and unsubscribes on unmount', async () => {
    const api = await createMockMessengerApi();
    const view = renderApp('/settings', api, true);

    const input = await screen.findByLabelText('Display name');
    await waitFor(() => expect(input).toHaveValue('You'));
    expect(api.events.listenerCount('identity.changed')).toBeGreaterThan(0);

    await api.updateDisplayName('Event User');
    await waitFor(() => expect(input).toHaveValue('Event User'));

    view.unmount();
    expect(api.events.listenerCount('identity.changed')).toBe(0);
  });

  it('updates the local profile through the Core identity contract', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    renderApp('/settings', api, true);

    const input = await screen.findByLabelText('Display name');
    await waitFor(() => expect(input).toHaveValue('You'));

    await user.clear(input);
    await user.type(input, 'Arshad');
    await user.click(screen.getByRole('button', { name: /save name/i }));

    expect(
      await screen.findByText('Display name updated in the mock session.'),
    ).toBeInTheDocument();
    expect((await api.getIdentity()).displayName).toBe('Arshad');
  });

  it('connects and disconnects a peer through the Core facade', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    const connectSpy = vi.spyOn(api, 'connect');
    const disconnectSpy = vi.spyOn(api, 'disconnect');
    renderApp('/nearby', api, true);

    await user.click(await screen.findByRole('button', { name: 'Connect to Aisha' }));

    expect(connectSpy).toHaveBeenCalledWith('peer_aisha');
    expect(api.network.getConnection('peer_aisha')?.state).toBe('connected');
    expect(
      await screen.findByRole('button', { name: 'Disconnect from Aisha' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Disconnect from Aisha' }));

    expect(disconnectSpy).toHaveBeenCalledWith('peer_aisha');
    expect(api.network.getConnection('peer_aisha')?.state).toBe('disconnected');
    expect(
      await screen.findByRole('button', { name: 'Connect to Aisha' }),
    ).toBeInTheDocument();
  });

  it('shows a safe per-peer error when connecting fails', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    vi.spyOn(api, 'connect').mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 192.168.1.4:7000'),
    );
    renderApp('/nearby', api, true);

    await user.click(await screen.findByRole('button', { name: 'Connect to Aisha' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Connection could not be updated.');
    expect(alert).not.toHaveTextContent('ECONNREFUSED');
    expect(alert).not.toHaveTextContent('192.168.1.4');
  });
});
