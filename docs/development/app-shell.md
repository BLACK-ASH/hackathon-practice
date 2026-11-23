# Level 0 application shell

The navigable shell lives in [`app/`](../../app/). It is a separate npm package so UI work and Core work can proceed independently. It consumes Core Foundation through a single adapter and currently renders mock data only.

## Run locally

```bash
cd app
npm ci
npm run dev
```

Other commands:

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run preview
```

No runtime network request is made. Dependencies are needed only for installation, tests and build.

## Structure

- `src/main.tsx` — mounts `<App />` inside `<MessengerProvider>`.
- `src/App.tsx` — owns `HashRouter`, the shell layout and the route table.
- `src/integration/MessengerProvider.tsx` — the only UI-to-Core adapter; loads facade data, subscribes to `AppEvents`, exposes `useMessenger()`, and coordinates peer connection actions.
- `src/integration/MessengerProvider.test.tsx` — Core mock, loading, error, profile-update and peer connection integration tests.
- `src/integration/boundaries.test.ts` — enforces public aliases and forbids runtime network APIs.
- `src/shell/navigation.ts` — single source of truth for destination labels, paths and icons.
- `src/shell/AppShell.tsx` — separates persistent navigation from routed main content.
- `src/shell/SidebarNav.tsx` — desktop sidebar; collapses to an icon rail on tablet.
- `src/shell/MobileNav.tsx` / `MobileDrawer.tsx` — compact bottom navigation and drawer on mobile.
- `src/pages/ChatsPage.tsx`, `GroupsPage.tsx`, `TransfersPage.tsx`, `SettingsPage.tsx` — read-only Core-backed mock pages.
- `src/pages/NearbyPage.tsx` — thin route adapter for the peer directory.
- `src/peers/` — module-local peer directory UI: list, cards, inline details, connect/disconnect actions, status helpers, styles and tests.
- `src/components/PageState.tsx` — shared loading, error and empty states.
- `src/pages/PlaceholderPage.tsx` — retained as a reference for future module-owned screens; not routed.
- `src/pages/NotFoundPage.tsx` — unknown-route recovery.
- `src/styles/tokens.css` — shell-level design tokens, including optional dark tokens. No theme toggle is implemented.

## Routes

| Path | Destination | Current content |
|---|---|---|
| `/` | Redirects to `/chats` | — |
| `/chats` | Chats | Mock conversations from `listConversations()` |
| `/nearby` | Nearby Devices | Peer directory from `listPeers()` with availability, connection state, last seen, inline details and connect/disconnect actions |
| `/groups` | Groups | Mock groups from `listGroups()` |
| `/transfers` | File Transfers | Mock transfer records from `listTransfers()` |
| `/settings` | Settings | Mock identity/profile and module health; display name update via `updateDisplayName()` |
| `*` | Page not found | `NotFoundPage` |

`AppShell` remains mounted while `<Outlet />` content changes.

## Core integration

`MessengerProvider` uses these public contracts:

- `MessengerApi` from `#contracts/app.ts`.
- `PeerInfo`, `PeerIdentity`, `Conversation`, `GroupInfo`, `FileTransferRecord` and `ModuleHealthReport` types from `#contracts/index.ts`.
- `AppError` and `toErrorInfo()` from `#core/index.ts`, plus `toUiErrorInfo()` for unknown failures.
- `createMockMessengerApi()` from `#mocks/index.ts` when no real facade is injected.

It calls `getIdentity()`, `listConversations()`, `listGroups()`, `listTransfers()`, `listPeers()`, `getModuleHealth()`, `connect()` and `disconnect()`. It subscribes to `core.module.health`, `identity.changed`, peer/connection events, messaging events, group events, transfer events and `storage.error`. Connection actions expose per-peer pending state and safe error messages through `useMessenger()`.

`app/src/test/renderApp.tsx` accepts an optional `MessengerApi` plus a `mock` flag, so real and mock facades can be injected in tests without changing page components.

## Peer directory

`NearbyPage` renders `PeerDirectory`, which reads `peers`, `state`, `error`, `pendingPeerIds` and `connectionErrors` from `useMessenger()`. It uses `PeerInfo` directly; there is no second peer model. `peerStatus.ts` maps availability and connection state to user-facing labels, accessible badge names and neutral/error/positive/pending tones. The directory shows device name, platform, availability, connection state, discovered time and last seen time, plus accessible inline details. It sorts connected peers first, then connecting/reconnecting, disconnected/available and offline peers, and it closes details if a peer disappears from a refreshed snapshot.

Connection buttons call `MessengerProvider` actions, which delegate to `MessengerApi.connect()` and `MessengerApi.disconnect()`. The provider marks the peer as pending, clears any previous action error, refreshes the snapshot after the action, and converts failures to safe `ErrorInfo` messages. `PeerCard` shows the per-peer error and disables actions while pending, while connecting, or for offline peers. The UI does not import `MockPeerNetwork` or expose IP addresses, ports or raw network errors.

## Mock-only behavior

Every data page says it is mock data. The shell does not send messages, discover peers, create real groups, transfer files or persist profile changes across restarts. No `fetch`, `WebSocket` or `EventSource` call is used; a boundary test enforces this.

## Build aliases

`app/vite.config.ts` and `app/tsconfig.json` share aliases:

| Alias | Target |
|---|---|
| `#core/*` | `../modules/core/src/*` |
| `#contracts/*` | `../shared/contracts/*` |
| `#types/*` | `../shared/types/*` |
| `#mocks/*` | `../shared/mocks/*` |

Vite also allows the repository root via `server.fs.allow` so the aliases work in dev and tests.

## Responsive behavior

- **Desktop (≥1024px):** 264px sidebar with branding, labels, active state, and footer status.
- **Tablet (768–1023px):** 76px icon rail; labels hidden but accessible names retained.
- **Mobile (<768px):** sticky top bar, menu drawer, five-item bottom navigation, safe-area padding, and no horizontal overflow.

Breakpoints are CSS-only; component behavior does not depend on the viewport.

## Accessibility

- Skip link is the first focusable element, has a visible focus outline, and moves focus to `<main>`.
- Navigation landmarks and icon-only controls have explicit accessible names; icons are hidden from screen readers.
- The mobile drawer starts focus on its close button, traps Tab within the dialog, closes on Escape, and restores focus to the menu button.
- Error pages use `role="alert"`; loading and empty states are text-labeled.
- Design tokens meet WCAG AA contrast for normal text in both light and dark themes.

## Future module integration points

1. A module exposes a public route-level component from its own directory.
2. Replace only that route's page element in `app/src/App.tsx`. Keep `AppShell`, `Outlet` and `MessengerProvider` intact.
3. If a destination needs nested routes, add children beneath its existing parent route.
4. Modules must not import shell internals or another module's private implementation.
5. Settings may later apply `data-theme="dark"` on the document root; tokens are already defined.

See [integration handoff](app-shell-integration-handoff.md) for validation results and remaining decisions.
