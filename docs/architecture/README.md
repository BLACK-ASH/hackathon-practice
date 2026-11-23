# Architecture

This document records architectural goals and boundaries. The shared storage technology is finalized as Dart + drift/SQLite ([ADR 0001](../decisions/0001-local-storage-drift-sqlite.md)); UI, discovery, and transport choices remain open and belong in [decisions](../decisions/README.md) once agreed.

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

## Peer-to-peer communication concept

Peers discover each other on the local network, exchange identity, then open direct connections for messages and files. Group messages are distributed over those same direct connections — one unreachable member must not block the rest. Discovery is abstracted so platform-specific mechanisms can be swapped in.

## No central server

The LAN provides connectivity only. No central messaging server, relay, cloud messaging service, or internet prerequisite may be introduced for core features.

## Offline-first principle

Open, discover, chat, share, and read history with no internet. Local storage is the source of truth for identity, conversations, groups, and file metadata; all of it remains readable offline.

## Dependency boundaries

Dependencies run one way: feature modules depend on foundation contracts, network interfaces, and storage interfaces. Network core must not depend on UI or chat logic. Feature modules must not depend on unrelated feature internals. Circular dependencies are prohibited.

## Local storage foundation

`modules/storage` is an independent Dart package using drift over SQLite. It owns one shared database per application installation, migration ordering, typed settings, and parameterized SQL access. It deliberately does not export the raw drift database, depend on Flutter, or contain network/feature logic.

The app shell supplies the application data path and setting definitions, calls a single `initialize()`, consumes health/status, and closes the storage on shutdown. Feature modules receive persistence through the package's public API and shared migration definitions; they must not create private databases. The storage database path is infrastructure and must stay hidden from end users.

Platform packaging for native SQLite (especially Flutter/mobile) remains an app-level integration task; the Dart package itself has been verified with Windows/Dart tests.

## Graceful degradation

Every module initializes independently with a health/status signal and timeouts. Discovery failure, network loss, storage errors, or platform capability gaps disable or fall back only the affected feature; errors are reported clearly to users without raw network details.
