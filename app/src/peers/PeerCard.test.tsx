import type { ErrorInfo } from '#contracts/errors.ts';
import type { PeerInfo } from '#contracts/peer.ts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatTime } from '../pages/format.ts';
import { PeerCard } from './PeerCard.tsx';

const discoveredAt = Date.UTC(2026, 0, 1, 9, 0, 0);
const lastSeenAt = Date.UTC(2026, 0, 1, 9, 5, 0);

const peer: PeerInfo = {
  peerId: 'peer_aisha',
  displayName: 'Aisha',
  deviceName: 'Pixel 8',
  platform: 'android',
  availability: 'available',
  connectionState: 'connected',
  discoveredAt,
  lastSeenAt,
};

describe('PeerCard', () => {
  it('renders peer identity, status, platform, availability, and last seen time', () => {
    render(
      <PeerCard
        detailsId="peer-details-peer_aisha"
        expanded={false}
        onToggleDetails={() => undefined}
        peer={peer}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Aisha', level: 3 })).toBeInTheDocument();
    expect(screen.getByLabelText('Connection: Connected')).toHaveTextContent('Connected');
    expect(screen.getByText('Pixel 8 · Android')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText(formatTime(lastSeenAt))).toBeInTheDocument();
  });

  it('exposes an accessible details toggle and reports toggle intent', async () => {
    const user = userEvent.setup();
    const onToggleDetails = vi.fn();

    render(
      <PeerCard
        detailsId="peer-details-peer_aisha"
        expanded={false}
        onToggleDetails={onToggleDetails}
        peer={peer}
      />,
    );

    const button = screen.getByRole('button', { name: 'View details for Aisha' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'peer-details-peer_aisha');

    await user.click(button);
    expect(onToggleDetails).toHaveBeenCalledWith('peer_aisha');
  });

  it('shows a muted status for an offline peer', () => {
    const offline: PeerInfo = {
      ...peer,
      availability: 'offline',
      connectionState: 'disconnected',
    };

    render(
      <PeerCard
        detailsId="peer-details-peer_sam"
        expanded={false}
        onToggleDetails={() => undefined}
        peer={offline}
      />,
    );

    expect(screen.getByLabelText('Connection: Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect to Aisha' })).toBeDisabled();
  });

  it('offers a disconnect action for a connected peer', async () => {
    const user = userEvent.setup();
    const onDisconnect = vi.fn(async () => undefined);

    render(
      <PeerCard
        detailsId="peer-details-peer_aisha"
        expanded={false}
        onDisconnect={onDisconnect}
        onToggleDetails={() => undefined}
        peer={peer}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Disconnect from Aisha' }));
    expect(onDisconnect).toHaveBeenCalledWith('peer_aisha');
  });

  it('offers a connect action for a disconnected peer', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn(async () => undefined);

    render(
      <PeerCard
        detailsId="peer-details-peer_aisha"
        expanded={false}
        onConnect={onConnect}
        onToggleDetails={() => undefined}
        peer={{ ...peer, connectionState: 'disconnected' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Connect to Aisha' }));
    expect(onConnect).toHaveBeenCalledWith('peer_aisha');
  });

  it('disables the action while pending and shows a safe action error', () => {
    const actionError: ErrorInfo = {
      code: 'unavailable',
      message: 'Connection could not be updated.',
      retryable: true,
    };

    render(
      <PeerCard
        actionError={actionError}
        detailsId="peer-details-peer_aisha"
        expanded={false}
        onConnect={vi.fn(async () => undefined)}
        onToggleDetails={() => undefined}
        peer={{ ...peer, connectionState: 'disconnected' }}
        pending
      />,
    );

    expect(screen.getByRole('button', { name: 'Updating connection for Aisha' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Connection could not be updated.');
  });
});
