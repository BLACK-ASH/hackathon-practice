# P2P LAN Messenger

A cross-platform, offline-first messaging application for devices connected to the same Wi-Fi network or hotspot. Devices discover each other locally and exchange messages and files directly, without internet access, accounts, or a central messaging server.

## Purpose

Make local peer-to-peer communication simple enough for anyone to use: open the app, set a display name, see nearby people, and start talking. Networking details stay hidden from users.

## Status

**Foundation in progress.** The shared local storage foundation is implemented as a standalone Dart package with SQLite/drift, tested, and documented. The application shell, UI, networking, messaging, groups, and file-transfer modules are still placeholders.

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

- `modules/storage/` — implemented local storage foundation (`p2p_storage`): lifecycle, migrations, typed settings, and safe SQL access. See [its README](modules/storage/README.md).
- `modules/` — other planned independent modules: core (foundation), network, messaging, groups, and file-transfer.
- `shared/` — home for agreed contracts and types before implementation.
- `docs/` — architecture, module, development, and decision documentation.
- `project/` — milestones, module boundaries, and development workflow.
- `tests/` — testing approach and implemented storage tests.

```powershell
cd modules/storage
dart pub get
dart analyze
dart test
dart run example/storage_demo.dart
```

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
