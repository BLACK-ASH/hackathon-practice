import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MessengerApi } from '#contracts/app.ts';
import { AppRoutes } from '../App';
import { MessengerProvider } from '../integration/MessengerProvider';

export function renderApp(route = '/', api?: MessengerApi, mock = false) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MessengerProvider api={api} mock={mock}>
        <AppRoutes />
      </MessengerProvider>
    </MemoryRouter>,
  );
}
