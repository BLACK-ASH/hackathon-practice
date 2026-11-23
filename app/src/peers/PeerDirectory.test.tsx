import type { ErrorInfo } from '#contracts/errors.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeerDirectory } from './PeerDirectory.tsx';

const now = Date.UTC(2026, 0, 1, 9, 0, 0);

function makePeer(overrides: Partial<PeerInfo>): PeerInfo {
  return {
    peerId: 'peer_test',
    displayName: 'Test Device',
    availability: 'available',
    connectionState: 'disconnected',
    discoveredAt: now,
    lastSeenAt: now,
    ...overrides,
  };
}

const peers: readonly PeerInfo[] = [
  makePeer({
    peerId: 'peer_sam',
    displayName: 'Sam',
    deviceName: 'MacBook Air',
    platform: 'macos',
    availability: 'offline',
    connectionState: 'disconnected',
  }),
  makePeer({
    peerId: 'peer_rahul',
    displayName: 'Rahul',
    deviceName: 'ThinkPad',
    platform: 'linux',
    availability: 'available',
    connectionState: 'disconnected',
  }),
  makePeer({
    peerId: 'peer_aisha',
    displayName: 'Aisha',
    deviceName: 'Pixel 8',
    platform: 'android',
    availability: 'available',
    connectionState: 'connected',
  }),
];

describe('PeerDirectory', () => {
  it('renders a loading state', () => {
    render(<PeerDirectory error={undefined} peers={[]} state="loading" />);

    expect(screen.getByText('Loading nearby devices')).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    render(<PeerDirectory error={undefined} peers={[]} state="ready" />);

    expect(screen.getByRole('heading', { name: 'No nearby devices' })).toBeInTheDocument();
    expect(screen.getByText('Discovered devices will appear here.')).toBeInTheDocument();
  });

  it('renders a safe error state', () => {
    const error: ErrorInfo = {
      code: 'io',
      message: 'Peer directory unavailable.',
      retryable: true,
    };

    render(<PeerDirectory error={error} peers={[]} state="error" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Peer directory unavailable.');
  });

  it('renders all peers in a stable connection-first order', () => {
    render(<PeerDirectory error={undefined} peers={peers} state="ready" />);

    const names = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

    expect(names).toEqual(['Aisha', 'Rahul', 'Sam']);
    expect(screen.getByLabelText('Connection: Connected')).toBeInTheDocument();
    expect(screen.getByLabelText('Connection: Unavailable')).toBeInTheDocument();
  });

  it('opens and closes inline peer details', async () => {
    const user = userEvent.setup();
    render(<PeerDirectory error={undefined} peers={peers} state="ready" />);

    await user.click(screen.getByRole('button', { name: 'View details for Aisha' }));

    expect(screen.getByRole('complementary', { name: /device details/i })).toBeInTheDocument();
    const details = screen.getByRole('complementary', { name: /device details/i });
    expect(within(details).getByText('Pixel 8')).toBeInTheDocument();

    await user.click(within(details).getByRole('button', { name: 'Hide details for Aisha' }));

    expect(screen.queryByRole('complementary', { name: /device details/i })).not.toBeInTheDocument();
  });

  it('updates the selected peer when peer data changes', () => {
    const { rerender } = render(
      <PeerDirectory error={undefined} peers={peers} state="ready" />,
    );

    rerender(
      <PeerDirectory
        error={undefined}
        peers={[
          ...peers.slice(0, 2),
          makePeer({
            peerId: 'peer_aisha',
            displayName: 'Aisha Updated',
            deviceName: 'Pixel 9',
            platform: 'android',
            availability: 'available',
            connectionState: 'connected',
          }),
        ]}
        state="ready"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Aisha Updated', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Pixel 9 · Android')).toBeInTheDocument();
  });

  it('closes details when the selected peer disappears', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PeerDirectory error={undefined} peers={peers} state="ready" />,
    );

    await user.click(screen.getByRole('button', { name: 'View details for Aisha' }));
    expect(screen.getByText('Device details')).toBeInTheDocument();

    rerender(
      <PeerDirectory
        error={undefined}
        peers={peers.filter((peer) => peer.peerId !== 'peer_aisha')}
        state="ready"
      />,
    );

    expect(screen.queryByText('Device details')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Aisha', level: 3 })).not.toBeInTheDocument();
  });

  it('passes connection actions and per-peer state to the matching card', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn(async () => undefined);
    const onDisconnect = vi.fn(async () => undefined);
    const actionError: ErrorInfo = {
      code: 'unavailable',
      message: 'Connection could not be updated.',
      retryable: true,
    };

    render(
      <PeerDirectory
        connectionErrors={{ peer_rahul: actionError }}
        error={undefined}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        peers={peers}
        pendingPeerIds={['peer_sam']}
        state="ready"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Connect to Rahul' }));

    expect(onConnect).toHaveBeenCalledWith('peer_rahul');
    expect(screen.getByRole('button', { name: 'Updating connection for Sam' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Connection could not be updated.');
  });
});
