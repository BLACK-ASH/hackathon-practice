# P2P LAN Messenger

A cross-platform, offline-first messaging application for devices connected to the same Wi-Fi network or hotspot. Devices discover each other locally and exchange messages and files directly, without internet access, accounts, or a central messaging server.

## Purpose

Make local peer-to-peer communication simple enough for anyone to use: open the app, set a display name, see nearby people, and start talking. Networking details stay hidden from users.

## Status

Level 0 Foundation is implemented and verified: the Flutter app shell starts with mock-backed identity and configuration, shared contracts/services are available as a local Dart package, and the automated suite passes (`flutter analyze`, 47 `flutter test` cases). Real peer discovery, direct transport, messaging, groups, file transfer, and production persistent storage are still planned; current dependency providers are explicitly mock implementations.

## Core features (planned)

- Automatic local peer discovery with no manual IP or port entry.
- Persistent local identity (peer ID, display name, optional avatar).
- Direct private messaging with local conversation history.
- Group messaging over direct peer connections.
- Direct file sharing with metadata validation and progress.
- Peer availability/status and reconnect handling.
- Full operation without internet access.

## Offline / LAN concept

The local network provides connectivity only. It must not host or process the messaging service. Discovery and communication happen directly between peers; conversation history lives on each device.

## Cross-platform goal

One shared codebase for desktop and mobile where practical, with platform-specific networking, storage, permissions, and UI behavior isolated behind adapters. Planned targets: Linux, Windows, macOS, Android, and iOS.

## Architecture overview

- `lib/` — Flutter application shell and composition root; `lib/src/foundation/` wires mock-backed foundation modules.
- `shared/lib/` — local Dart package `p2p_lan_messenger_shared`: shared types, contracts, foundation services, and clearly labeled mocks.
- `shared/documentation/` — notes describing the shared foundation layer.
- `docs/` — architecture, module, development, and decision documentation.
- `project/` — milestones, module boundaries, and development workflow.
- `test/` — automated Level 0 test suite.

See [AGENTS.md](AGENTS.md) for the full project context and agent rules.

## Planned milestones

| Milestone | Goal |
|---|---|
| M1 — Foundation | App shell, identity, navigation, mock data |
| M2 — Peer Connectivity | Discovery, direct connections, visible status |
| M3 — Private Messaging | Send/receive, durable history, disconnect handling |
| M4 — Group Messaging | Groups, invitations, resilient distribution |
| M5 — File Sharing | Direct transfers, validation, progress |
| M6 — Cross-Platform Stabilization | Desktop/mobile and network-failure testing |

Details: [project/milestones.md](project/milestones.md).

## Documentation map

- [Architecture](docs/architecture/README.md) · [Modules](docs/modules/README.md) · [Development](docs/development/README.md) · [Decisions](docs/decisions/README.md)
- [Module boundaries](project/module-boundaries.md) · [Workflow](project/development-workflow.md) · [Testing approach](tests/README.md)
