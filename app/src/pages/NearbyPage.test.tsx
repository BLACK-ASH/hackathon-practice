import { createMockMessengerApi } from '#mocks/index.ts';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/renderApp.tsx';

describe('Nearby Devices page', () => {
  it('renders seeded mock peers with availability and connection status', async () => {
    const api = await createMockMessengerApi();
    renderApp('/nearby', api, true);

    expect(await screen.findByRole('heading', { name: 'Aisha', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sam', level: 3 })).toBeInTheDocument();
    expect(screen.getByLabelText('Connection: Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/no live discovery/i)).toBeInTheDocument();
  });

  it('renders connected and reconnecting states', async () => {
    const api = await createMockMessengerApi();
    await api.network.connect('peer_aisha');
    api.network.markReconnecting('peer_rahul');
    renderApp('/nearby', api, true);

    expect(await screen.findByLabelText('Connection: Connected')).toBeInTheDocument();
    expect(screen.getByLabelText('Connection: Reconnecting')).toBeInTheDocument();
  });

  it('updates the directory when a peer is discovered', async () => {
    const api = await createMockMessengerApi();
    renderApp('/nearby', api, true);
    await screen.findByRole('heading', { name: 'Aisha', level: 3 });

    act(() => {
      api.network.addPeer({
        peerId: 'peer_priya',
        displayName: 'Priya',
        deviceName: 'iPad',
        platform: 'ios',
      });
    });

    expect(await screen.findByRole('heading', { name: 'Priya', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('iPad · iOS')).toBeInTheDocument();
  });

  it('updates an existing peer when discovery reports new details', async () => {
    const api = await createMockMessengerApi();
    renderApp('/nearby', api, true);
    await screen.findByRole('heading', { name: 'Aisha', level: 3 });

    act(() => {
      api.network.addPeer({
        peerId: 'peer_aisha',
        displayName: 'Aisha Updated',
        deviceName: 'Pixel 9',
        platform: 'android',
      });
    });

    expect(
      await screen.findByRole('heading', { name: 'Aisha Updated', level: 3 }),
    ).toBeInTheDocument();
  });

  it('removes a disappeared peer and closes its details', async () => {
    const user = userEvent.setup();
    const api = await createMockMessengerApi();
    renderApp('/nearby', api, true);
    await screen.findByRole('heading', { name: 'Aisha', level: 3 });

    await user.click(screen.getByRole('button', { name: 'View details for Aisha' }));
    expect(screen.getByText('Device details')).toBeInTheDocument();

    act(() => {
      api.network.forgetPeer('peer_aisha');
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Aisha', level: 3 })).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Device details')).not.toBeInTheDocument();
  });

  it('shows a safe error message when the facade fails with a raw network error', async () => {
    const api = await createMockMessengerApi();
    vi.spyOn(api, 'getIdentity').mockRejectedValue(
      new Error('connect ECONNREFUSED 192.168.1.4:7000'),
    );
    renderApp('/nearby', api, true);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This section could not be loaded.');
    expect(alert).not.toHaveTextContent('ECONNREFUSED');
    expect(alert).not.toHaveTextContent('192.168.1.4');
  });
});
