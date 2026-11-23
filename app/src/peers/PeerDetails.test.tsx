import type { PeerInfo } from '#contracts/peer.ts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatTime } from '../pages/format.ts';
import { PeerDetails } from './PeerDetails.tsx';

const discoveredAt = Date.UTC(2026, 0, 1, 9, 0, 0);
const lastSeenAt = Date.UTC(2026, 0, 1, 9, 5, 0);

const peer: PeerInfo = {
  peerId: 'peer_rahul',
  displayName: 'Rahul',
  deviceName: 'ThinkPad',
  platform: 'linux',
  availability: 'available',
  connectionState: 'reconnecting',
  discoveredAt,
  lastSeenAt,
};

describe('PeerDetails', () => {
  it('renders all read-only peer fields with accessible labels', () => {
    render(
      <PeerDetails
        detailsId="peer-details-peer_rahul"
        onClose={() => undefined}
        peer={peer}
      />,
    );

    const details = screen.getByRole('complementary', { name: /device details/i });
    expect(details).toBeInTheDocument();
    expect(screen.getByText('ThinkPad')).toBeInTheDocument();
    expect(screen.getByText('Linux')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
    expect(screen.getByText(formatTime(discoveredAt))).toBeInTheDocument();
    expect(screen.getByText(formatTime(lastSeenAt))).toBeInTheDocument();
  });

  it('calls onClose from an accessible button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <PeerDetails
        detailsId="peer-details-peer_rahul"
        onClose={onClose}
        peer={peer}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Hide details for Rahul' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows fallback labels when optional fields are absent', () => {
    render(
      <PeerDetails
        detailsId="peer-details-peer_unknown"
        onClose={() => undefined}
        peer={{
          ...peer,
          deviceName: undefined,
          platform: undefined,
        }}
      />,
    );

    expect(screen.getAllByText('Device name unavailable').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Platform unavailable').length).toBeGreaterThan(0);
  });
});
