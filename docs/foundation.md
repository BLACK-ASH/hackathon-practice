# Core Foundation (Level 0)

Implemented foundation and shared contracts for the P2P LAN Messenger. This is
the boundary layer every other module consumes; the Core implementation itself
contains **no** LAN discovery, chat, group, transfer, database or UI code. The
Level 0 UI shell lives separately in `app/` and consumes the facade described
below; see [Application shell](development/app-shell.md).

Technology decision: [ADR 0001](decisions/0001-typescript-cross-platform-foundation.md).
Package setup: Node 22.18+, strict TypeScript, `node:test`, no runtime dependencies.

## Layout and imports

| Path | Contents |
|---|---|
| `shared/types/` | Plain shared types: IDs, `Clock`, `Result` |
| `shared/contracts/` | Stable public interfaces, event map, contract helpers |
| `modules/core/src/` | Contract implementations: errors, IDs, clock, logger, config, events, lifecycle, identity, timeout |
| `shared/mocks/` | In-memory implementations of the contracts for tests and parallel development |
| `tests/` | Deterministic `node:test` suites, including an import-boundary check |

Internal imports use the package import map (no build step, no bundler):

```ts
import type { PeerNetwork } from '#contracts/network.ts';
import { AppError, TypedEventBus } from '#core/index.ts';
import { createTestContext } from '#mocks/index.ts';
```

`npm run typecheck` and `npm test` both understand these aliases. Contracts
never import core, mocks or feature modules; core never imports mocks or
feature modules. `tests/boundaries.test.ts` enforces this.

## Core services

- **Errors** — `AppError` with stable `ErrorCode`s and `toErrorInfo()`; `AppError.from()` wraps raw platform errors, `toErrorInfo()` produces event/health payloads. Retryable defaults: `unavailable`, `timeout`, `io`.
- **Result** — `Result<T, E>` plus `ok`/`err`/`isOk`/`isErr` for operations that report failure as a value rather than throwing.
- **IDs** — `IdGenerator.newId(prefix?)`; production uses `crypto.randomUUID()`, tests inject a deterministic generator.
- **Clock** — `Clock.now()`; `systemClock` in production, `MockClock` in tests.
- **Logging** — `Logger` with level filtering, child scopes and an injectable sink; default sink is `console`.
- **Config** — `loadConfig()` reads environment variables, merges defaults and returns `issues` instead of failing startup on a bad value (see below).
- **Events** — `TypedEventBus<TEvents>` with `on`, `once`, `emit`, `listenerCount`, `clear`.
- **Lifecycle** — `DefaultModuleRegistry` implementing `ModuleRegistry`.
- **Identity** — `createIdentityService()` generates/persists the local `PeerIdentity` through the storage contract and emits `identity.changed`.

## Stable contracts ready to consume

| File | Exports other modules should use |
|---|---|
| `shared/contracts/lifecycle.ts` | `AppModule`, `ModuleContext`, `ModuleRegistry`, `ModuleHealth`, `ModuleHealthReport`, `ModuleStartReport` |
| `shared/contracts/events.ts` | `EventBus`, `Subscription`, `AppEvents` |
| `shared/contracts/errors.ts` | `AppError`, `ErrorInfo`, `ErrorCode` (class lives in `modules/core`) |
| `shared/contracts/config.ts` | `AppConfig`, `LoadConfigResult`, `RuntimeEnvironment` |
| `shared/contracts/identity.ts` | `IdentityService`, `PeerIdentity`, `IdentityProfilePatch` |
| `shared/contracts/peer.ts` | `PeerInfo`, `ConnectionInfo`, `PeerAvailability`, `ConnectionState` |
| `shared/contracts/network.ts` | `PeerNetwork`, `CHANNELS`, `IncomingPeerMessage`, `PeerMessageHandler`, `SendOptions` |
| `shared/contracts/messaging.ts` | `MessagingService`, `ChatMessage`, `Conversation`, `MessageQuery`, `privateConversationId()`, `groupConversationId()` |
| `shared/contracts/groups.ts` | `GroupService`, `GroupInfo`, `GroupMember`, `CreateGroupInput` |
| `shared/contracts/files.ts` | `FileTransferService` (send/accept/reject/cancel), `FileSource`, `FileTransferRecord`, `FileTransferProgress` |
| `shared/contracts/storage.ts` | `StorageService` and its six repositories |
| `shared/contracts/app.ts` | `MessengerApi`, `ApplicationHost` |
| `shared/contracts/index.ts` | Re-exports all of the above |

`PeerNetwork.send(peerId, channel, payload)` carries opaque bytes. Feature
modules own their serialization; the network module never parses chat, group
or file payloads. `CHANNELS` reserves the three feature channels; control
traffic belongs inside the network module.

## Module lifecycle and isolation

```ts
const registry = new DefaultModuleRegistry({
  logger,
  clock: systemClock,
  events: new TypedEventBus<AppEvents>(),
  config: loadConfig().config,
  initTimeoutMs: 10_000, // 0 disables the timeout
});

registry.register(myNetworkModule); // before start(); duplicate IDs throw
const report = await registry.start();
await registry.stop();
```

- `register` → `starting` → `ready` (or `degraded`/`failed`) → `stopped`.
- `initialize(context)` receives only foundation services. Feature dependencies
  are injected through the module's constructor, so no module waits on another
  module's implementation.
- A thrown or timed-out `initialize` is recorded in health and `report.failed`;
  startup continues with later modules. `optional` is metadata for the UI.
- Modules can call `context.report('degraded', reason)` at any time, and
  `context.onCleanup(fn)` to register teardown that always runs on shutdown.
- `context.signal` is aborted on timeout and shutdown.
- `stop()` calls `shutdown()` in reverse registration order with a timeout,
  aborts each signal, then runs that module's cleanups in reverse order. A
  failing shutdown is isolated. The registry is one-shot: it cannot restart.
- `core.module.health` events announce every transition; `registry.health()`
  returns the current snapshots.

## Event system

`AppEvents` is the single typed map. Ownership:

| Emitter | Events |
|---|---|
| Core registry | `core.module.health` |
| Core identity | `identity.changed` |
| Network module | `network.peer.discovered`, `network.peer.updated`, `network.peer.lost`, `network.connection.changed` |
| Messaging | `messaging.conversation.updated`, `messaging.message.received`, `messaging.message.updated` |
| Groups | `groups.group.updated`, `groups.group.removed`, `groups.message.received` |
| File transfer | `files.transfer.requested` (pending incoming), `files.transfer.updated`, `files.transfer.progress` |
| Storage | `storage.error` |

Events are synchronous state announcements, not request/response calls. Use
direct interface methods for commands and queries. Dispatch snapshots handlers
so subscribe/unsubscribe during an emit is safe; one failing subscriber is
reported through `onSubscriberError` and does not block the others. Modules must
unsubscribe via `context.onCleanup(subscription.unsubscribe)`.

## Error handling conventions

- Throw `AppError` across module boundaries with a stable code and a
  user-safe message; wrap platform errors with
  `AppError.from(error, code, safeMessage)` so raw details stay in `cause` and
  never reach `ErrorInfo` or the UI.
- Use `ErrorInfo` in events, health and records; never expose raw socket paths,
  ports or stack traces to the UI.
- Peer-level failures belong in `ConnectionInfo.lastError` or a transfer
  record; module-wide failures belong in module health.
- Storage errors are thrown to the caller and may also be announced as
  `storage.error`; modules must not silently ignore them.

## Configuration

`loadConfig({ env, defaults })` reads `APP_ENV` (`development|test|production`),
`APP_LOG_LEVEL` (`debug|info|warn|error`), `APP_DATA_DIR`, `APP_NAME` and
`APP_VERSION`. Invalid values keep defaults and appear in `issues` so startup
can log them without crashing. Override `env` in tests for determinism.

## Mocks and parallel development

All mocks implement the real contracts and are explicitly mock-only. None
performs network I/O or durable writes.

- `createTestContext()` — shared `MockClock`, memory logger (records in
  `context.logs`), `TypedEventBus`, `InMemoryStorage`, `MockPeerNetwork`,
  `IdentityService` and deterministic IDs.
- `MockClock` — `now()`, `advance(ms)`, `set(ms)`; rejects backwards time.
- `createSequentialIdGenerator(start?)` — predictable `peer_1`, `msg_2`, …
- `InMemoryStorage` — all six repositories, clones on read/write, sorted
  lists, `failNext(operation)`, `clear()`.
- `MockPeerNetwork` — `addPeer`, `markPeerOffline`, `forgetPeer`, `connect`,
  `markReconnecting`, `disconnect`, `send`, `failNextSends`, `deliverFrom`,
  `deliverDuplicate`, `onMessage`; emits peer and connection events.
- `createMockMessengerApi()` — seeded `MessengerApi` with peers, chats, a group
  and a transfer. Sends never leave the process. Its `storage`, `network` and
  `identity` fields are test-only handles; UI code must use `MessengerApi`,
  events and health only.

```ts
const { network, storage, events, clock } = createTestContext();
network.addPeer({ peerId: 'p1', displayName: 'Aisha' });
await network.connect('p1');
network.onMessage(CHANNELS.messaging, (message) => {
  console.log(new TextDecoder().decode(message.payload));
});
await network.deliverDuplicate('p1', CHANNELS.messaging, new TextEncoder().encode('hi'));
```

The UI can start immediately against `createMockMessengerApi()`; it exposes
only `MessengerApi` plus events and health. Replace it with the real integration
facade later without changing UI code.

## Handoff by module

- **Network:** implement `PeerNetwork` with platform adapters; use
  `MockPeerNetwork` as the behavioral reference for discovery, reconnect,
  timeouts and failure states. No Core change is needed.
- **Messaging:** inject `PeerNetwork` and `StorageService`; use `CHANNELS.messaging`,
  `privateConversationId()`, mock peers and `deliverDuplicate()` for success,
  delay, failure, duplicate and offline scenarios.
- **Groups:** inject `PeerNetwork` and `StorageService`; use `CHANNELS.groups`,
  `GroupInfo`, `groupConversationId()` and per-member `send()` calls so one
  failure cannot block others.
- **File transfer:** inject `PeerNetwork` and `StorageService`; use
  `CHANNELS.files`, `FileSource.chunks()`, `FileTransferRecord`, announce
  pending incoming transfers with `files.transfer.requested`, and implement
  accept/reject/cancel. Progress events are defined in `AppEvents`.
- **Storage:** implement `StorageService` with the platform database; use
  `InMemoryStorage` for contract tests. Own all schemas and migrations.
- **UI:** consume `MessengerApi`, `AppEvents` and `ModuleHealthReport`; the
  wired shell does this in `app/src/integration/MessengerProvider.tsx` with
  `createMockMessengerApi()`. Never import storage or network internals.

## Validation

```bash
npm install          # two dev dependencies only
npm run typecheck    # tsc --noEmit
npm test             # node:test; 69 tests, no network or devices
npm run validate     # both
```

The app has its own dependency lockfile and validation commands; see
[Application shell](development/app-shell.md) and
[Testing](../tests/README.md).

## Known limits

- No real discovery, socket, database, native packaging or real `MessengerApi`
  adapter yet. The web UI shell exists in `app/` and uses mocks only.
- `ApplicationHost` and the real `MessengerApi` integration adapter are
  contracts only; the mock implements the latter for UI development.
- No delivery receipts, read receipts or transfer resumption protocol is
  defined; those are feature-level additions.
- Shutdown stops all modules; individual module restart is intentionally not
  supported by the Level 0 registry.
