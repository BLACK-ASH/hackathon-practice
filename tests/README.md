# Testing approach

## Current tooling

There are two independently validated packages.

### Core Foundation (root)

Level 0 uses strict TypeScript and Node 22.18+'s built-in test runner and type
stripping. There are no runtime dependencies and no build step.

```bash
npm install
npm test             # node --test tests/*.test.ts shared/mocks/test-context.ts
npm run typecheck    # tsc --noEmit
npm run validate     # both
```

`npm test` is scoped explicitly so the Node runner does not discover the UI's
Vitest files under `app/`. The mock-context smoke file is retained to preserve
the established 70-test baseline; the messaging engine adds 4 module tests.

All root suites are deterministic, offline and device-free. They live next
to this file:

| Suite | Covers |
|---|---|
| `core.test.ts` | AppError/Result, IDs, logger, clocks, timeouts |
| `config.test.ts` | Defaults, environment parsing, invalid-value reporting |
| `events.test.ts` | Subscribe/unsubscribe, `once`, safe dispatch, failure isolation |
| `lifecycle.test.ts` | Start order, failure isolation, timeouts, degraded health, shutdown/cleanup |
| `identity.test.ts` | ID generation, persistence, profile updates, validation, events |
| `mock-network.test.ts` | Simulated discovery, connect/disconnect/offline, send failures, duplicate delivery, handler isolation |
| `mock-storage.test.ts` | All repositories, ordering, cloning, failure injection |
| `mock-messenger.test.ts` | Seeded UI facade, send/read/retry, groups, transfers, health |
| `messaging.test.ts` | Real messaging engine over mocks: send/retry, receipts, ordering, duplicates, malformed payloads |
| `boundaries.test.ts` | Import-direction rules and runtime contract helpers |
| `shared/mocks/test-context.ts` | Import smoke coverage for the shared mock wiring |

### UI shell (`app/`)

The shell uses strict TypeScript, Vitest 5, Testing Library and jsdom. It has
its own dependency lockfile and is validated separately.

```bash
cd app
npm ci
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run lint         # eslint .
npm run build        # tsc --noEmit && vite build
```

| Suite | Covers |
|---|---|
| `src/App.test.tsx` | All five destinations, active navigation state, unknown-route recovery |
| `src/integration/MessengerProvider.test.tsx` | Core mock peers/chats, pending state, user-safe error state, profile update and peer connect/disconnect via `MessengerApi` |
| `src/integration/boundaries.test.ts` | Public aliases only, no unfinished module imports, no runtime network APIs |
| `src/peers/peerStatus.test.ts` | User-facing status labels, availability labels, platform/device fallbacks and badge tones |
| `src/peers/PeerCard.test.tsx` | Peer card content, accessible details toggle, connect/disconnect actions, pending state, safe action errors and offline state |
| `src/peers/PeerDetails.test.tsx` | Inline details fields, accessible close button and optional-field fallbacks |
| `src/peers/PeerDirectory.test.tsx` | Loading/empty/error/ready states, connection-first ordering, details lifecycle, peer refresh handling and action pass-through |
| `src/pages/NearbyPage.test.tsx` | Route-level peer status rendering, Core event updates, peer disappearance and safe error display |
| `src/chat/ChatUI.test.tsx` | Private inbox rendering, stored history, send/Enter/Shift+Enter, empty draft, pending and failed sends, safe history errors, event-driven updates, duplicate suppression, loading, empty and not-found states |
| `src/groups/GroupUI.test.tsx` | Group list previews, creation validation and navigation, member/details view, stored group history, sends, safe failures, event-driven updates, duplicate suppression, empty and not-found states |

Current results: root `74/74` passing; app `65/65` passing. No real LAN devices,
native runtime, network sockets or external services are used.

## Planned levels

- **Unit tests** — pure logic in isolation: IDs, validation, message ordering, deduplication, metadata checks.
- **Module tests** — one module at a time through its public interface, with its dependencies mocked; verifies module health and failure isolation.
- **Integration tests** — modules working together through stable contracts (messaging + network + storage, groups + network, transfers + storage).
- **Mock tests** — explicit scenarios: discovery/connect/disconnect/reconnect; delayed, failed, duplicated and offline-peer messages; group invites and partial failures; interrupted, invalid, cancelled and progressing transfers.
- **Cross-device LAN tests** — real supported devices on ordinary Wi-Fi/hotspots, including restrictive networks; verifies discovery, direct messaging, groups and file sharing without internet.
- **Failure and recovery tests** — network loss, peer disappearance, storage corruption/errors, missing platform permissions or capabilities, and recovery paths; confirms other modules keep working.

Tests must describe actual behavior, and a feature is not "done" until it is
tested. Mobile/desktop layout and touch interaction are validated in M6.
