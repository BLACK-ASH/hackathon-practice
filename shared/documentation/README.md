# Shared foundation

This directory documents the Level 0 shared layer used by the app shell and future modules. The Dart sources are a local path package rooted at `shared/` and published as `p2p_lan_messenger_shared`; import them with `package:p2p_lan_messenger_shared/...`.

No networking, messaging, group, file-transfer, or production persistent-storage implementation is provided here. Everything below is foundation behavior or a clearly labeled development double.

## Types

`shared/lib/types` contains immutable value types used across module boundaries:

- `PeerId` — validated stable peer identifier.
- `DisplayName` — validated human-readable peer name.
- `PeerDescriptor` — immutable pairing of `PeerId` and `DisplayName`.
- `TransportPayload` — validated opaque payload text; it does not define a message schema.
- `LocalIdentity` — persistent local identity value with display-name replacement.
- `ApplicationConfig` — validated settings with initialization timeout and copy support.
- `ModuleStatus` / `ModuleHealth` — lifecycle state and health reporting.

Import via `package:p2p_lan_messenger_shared/types/types.dart`.

## Contracts and interfaces

`shared/lib/contracts` contains request/value contracts, common errors, events, and module-boundary interfaces:

- `PeerSnapshot` — read-only collection of `PeerDescriptor` values.
- `PeerSendRequest` — typed recipient plus `TransportPayload`.
- `FoundationError` / `ErrorReporter` — typed foundation errors and safe reporting.
- `FoundationEvent`, `IdentityChanged`, `ConfigurationChanged`, `ModuleStatusChanged`, `EventSubscription`, `EventBus` — shared event contracts.
- `FoundationModule` — name, initialize, health, and dispose contract.
- `IdentityStorage` / `SettingsStorage` — typed local persistence interfaces.
- `PeerDirectory` / `PeerPayloadSender` — peer-boundary interfaces.
- `PeerIdGenerator` — deterministic identity-ID source for tests and composition.

Import via `package:p2p_lan_messenger_shared/contracts/contracts.dart`.

## Foundation services

`shared/lib/foundation` contains reusable implementations:

- `IdentityManager` — loads or creates local identity through `IdentityStorage` and publishes identity changes.
- `ConfigurationManager` — loads/persists `ApplicationConfig` through `SettingsStorage` and publishes changes.
- `FoundationEventBus` — typed subscriptions with isolated handler-failure reporting.
- `ModuleRegistry` — registration, timeout-bounded initialization, health events, and failure isolation.

Import via `package:p2p_lan_messenger_shared/foundation/foundation.dart`.

## Mocks

`shared/lib/mocks/mocks.dart` provides clearly labeled development/test doubles: `MockPeerDirectory`, `MockPeerPayloadSender`, `MockIdentityStorage`, `MockSettingsStorage`, `MockPeerIdGenerator`, `RecordingErrorReporter`, and `StubFoundationModule`. They satisfy the same interfaces as future real implementations and are wired into the runnable app shell by `lib/src/foundation/foundation_components.dart`.

## Boundaries not covered here

Real peer discovery/connections, message and group distribution, file transfer, production storage adapters, platform permissions/adapters, user-facing settings UI, and responsive mobile/desktop navigation remain outside this layer.
