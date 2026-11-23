# Architecture

This document records architectural goals and boundaries. The Level 0
language/tooling decision is in
[ADR 0001](decisions/0001-typescript-cross-platform-foundation.md); the web UI
stack decision is in [ADR 0002](decisions/0002-app-shell-ui-stack.md). The
implemented foundation and its contracts are in
[Core Foundation](../foundation.md). The web shell is in
[Application shell](../development/app-shell.md); native packaging is deferred.

## Goals

- Cross-platform UI with shared application logic wherever possible.
- Small, independently buildable and testable modules.
- Reliability offline and on ordinary local networks, including restrictive hotspots.
- Simple setup: no IP addresses, ports, accounts, or manual connections for users.
- Graceful degradation: one failing module or peer must not take down the app.

## Cross-platform considerations

Core logic must not depend on a specific operating system. Platform-specific behavior — discovery, sockets, permissions, file access, notifications, storage, and UI adaptation — sits behind shared interfaces/adapters. Desktop, tablet, and mobile layouts need their own appropriate navigation, not a shrunken desktop view.

## Modular architecture

Planned modules: core/foundation, network (discovery + connections), messaging, groups, file-transfer, and local storage. See [module documentation](../modules/README.md) and [module boundaries](../../project/module-boundaries.md). Modules communicate through stable contracts and events, never through each other's internals.

## Level 0 UI boundary

The UI consumes only the public facade and its typed dependencies:

- `app/src/integration/MessengerProvider.tsx` is the only UI-to-Core adapter.
- Page components use `useMessenger()`; they never import storage, network or feature-module internals.
- Imports go through package aliases: `#contracts/*`, `#core/*`, `#types/*` and `#mocks/*`.
- Core `AppError` messages are preserved via `toErrorInfo()`; unknown failures are wrapped by `toUiErrorInfo()` with a generic safe message.
- The current implementation injects `createMockMessengerApi()` and labels every page as mock data.

`app/src/integration/boundaries.test.ts` enforces that UI imports stay inside those aliases and approved packages, and that no `fetch`, `WebSocket` or `EventSource` call is introduced.

## Peer-to-peer communication concept

Peers discover each other on the local network, exchange identity, then open direct connections for messages and files. Group messages are distributed over those same direct connections — one unreachable member must not block the rest. Discovery is abstracted so platform-specific mechanisms can be swapped in.

## No central server

The LAN provides connectivity only. No central messaging server, relay, cloud messaging service, or internet prerequisite may be introduced for core features.

## Offline-first principle

Open, discover, chat, share, and read history with no internet. Local storage is the source of truth for identity, conversations, groups, and file metadata; all of it remains readable offline.

## Dependency boundaries

Dependencies run one way: feature modules depend on foundation contracts, network interfaces, and storage interfaces. Network core must not depend on UI or chat logic. Feature modules must not depend on unrelated feature internals. Circular dependencies are prohibited.

## Graceful degradation

Every module initializes independently with a health/status signal and timeouts. Discovery failure, network loss, storage errors, or platform capability gaps disable or fall back only the affected feature; errors are reported clearly to users without raw network details.

## Validation surfaces

The root project and the UI package are validated independently:

```bash
# root: strict TypeScript + node:test
npm run validate

# app: strict TypeScript + Vitest + ESLint + Vite build
cd app && npm run typecheck && npm test && npm run lint && npm run build
```
