import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigationItems } from './shell/navigation';
import { renderApp } from './test/renderApp';

describe('application shell routing', () => {
  it('redirects the initial route to chats and renders the shell', async () => {
    renderApp('/');

    const primaryNav = screen.getByRole('navigation', { name: /primary navigation/i });
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });

    await waitFor(() => {
      expect(within(primaryNav).getByRole('link', { name: 'Chats' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Chats' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'Chats' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Local. Private. Offline.')).toBeInTheDocument();
  });

  it('navigates to every destination and updates active state', async () => {
    const user = userEvent.setup();
    renderApp('/chats');

    const primaryNav = screen.getByRole('navigation', { name: /primary navigation/i });

    for (const item of navigationItems) {
      await user.click(within(primaryNav).getByRole('link', { name: item.label }));

      expect(screen.getByRole('heading', { level: 1, name: item.label })).toBeInTheDocument();
      expect(
        screen.getByText(/mock (data|peers|groups|transfers|storage) from core/i),
      ).toBeInTheDocument();
      expect(within(primaryNav).getByRole('link', { name: item.label })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });

  it('renders a recovery state for unknown routes', async () => {
    const user = userEvent.setup();
    renderApp('/not-a-real-page');

    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /back to chats/i }));

    expect(screen.getByRole('heading', { level: 1, name: 'Chats' })).toBeInTheDocument();
  });

  it('opens and closes the mobile navigation drawer', async () => {
    const user = userEvent.setup();
    renderApp('/chats');

    await user.click(screen.getByRole('button', { name: /open navigation/i }));

    const drawer = screen.getByRole('dialog', { name: /navigation menu/i });
    expect(within(drawer).getAllByRole('link')).toHaveLength(navigationItems.length);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps drawer focus inside the dialog and restores it on close', async () => {
    const user = userEvent.setup();
    renderApp('/chats');

    const menuButton = screen.getByRole('button', { name: /open navigation/i });
    menuButton.focus();
    await user.click(menuButton);

    const drawer = screen.getByRole('dialog', { name: /navigation menu/i });
    const closeButton = within(drawer).getByRole('button', { name: /close navigation/i });
    const lastLink = within(drawer).getByRole('link', { name: 'Settings' });

    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastLink).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(menuButton).toHaveFocus();
  });
});
