# P2P LAN Messenger

A cross-platform, offline-first messaging application for devices connected to the same Wi-Fi network or hotspot. Devices discover each other locally and exchange messages and files directly, without internet access, accounts, or a central messaging server.

## Purpose

Make local peer-to-peer communication simple enough for anyone to use: open the app, set a display name, see nearby people, and start talking. Networking details stay hidden from users.

## Status

**Level 0 Core Foundation and the Level 0 UI shell are implemented and validated.** Shared contracts, the core library, mock infrastructure and 74 root tests are in place. The independent Level 2 private-messaging engine adds 4 module tests. The UI shell in `app/` is wired to the Core `MessengerApi` mock facade and has 65 Vitest tests; it includes mock-backed inbox, one-to-one chat, and group creation, listing and chat.

Real peer discovery/network, durable storage, real group distribution, file transfer and the real integration facade are not implemented. The UI displays clearly labeled mock data; it does not send real messages, discover real peers or transfer real files.

```bash
# Core Foundation (root)
npm install
npm run validate       # typecheck + node:test, no network or devices

# UI shell
cd app
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

See [Core Foundation](docs/foundation.md), [Application shell](docs/development/app-shell.md) and the [integration handoff](docs/development/app-shell-integration-handoff.md).

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

- `app/` — web UI shell: responsive navigation, Core-backed mock pages, mock-backed private chat and group UI, and focused UI tests.
- `modules/` — independent modules: core and private messaging implemented, with placeholders for network, groups, file-transfer and storage.
- `shared/` — agreed contracts and types (`shared/contracts`, `shared/types`) plus mock implementations for parallel development (`shared/mocks`).
- `docs/` — architecture, module, development, decision and foundation documentation.
- `project/` — milestones, module boundaries and development workflow.
- `tests/` — deterministic foundation and mock tests using Node's test runner.

See [AGENTS.md](AGENTS.md) for the full project context and agent rules.
See [Core Foundation](docs/foundation.md) for the implemented public interfaces.

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
- [Core Foundation](docs/foundation.md) · [Application shell](docs/development/app-shell.md) · [Integration handoff](docs/development/app-shell-integration-handoff.md)
- [Module boundaries](project/module-boundaries.md) · [Workflow](project/development-workflow.md) · [Testing](tests/README.md)
