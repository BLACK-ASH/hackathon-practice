# Modules

Local Storage is implemented as `modules/storage` (`p2p_storage`); the remaining module directories are still placeholders. Shared contracts live in `shared/`; boundaries are detailed in [module boundaries](../../project/module-boundaries.md).

## Core & Foundation

- **Responsibility:** application lifecycle, shared contracts, common types, local identity, configuration, module registration/health, events, errors, coordination.
- **Scope:** small Level 0 base that other modules can depend on; mock-friendly from day one.
- **Depends on:** platform/storage interfaces it defines itself; nothing else.
- **Must not own:** networking, chat rules, group rules, transfer logic, UI widgets.
- **Testing:** lifecycle, identity persistence contract, module init/failure isolation, event contracts.

## Peer Discovery & Network Core

- **Responsibility:** local discovery, peer registry, identity exchange, direct connections, heartbeats, availability, reconnection, network events, platform adapters.
- **Scope:** transport and connection state only.
- **Depends on:** Foundation.
- **Must not own:** UI, message/group/file business logic.
- **Testing:** mocked discovery, connect/fail/disconnect/reconnect, duplicate and leaving peers.

## Messaging Engine

- **Responsibility:** private messages, IDs, send/receive, ordering, duplicate detection, delivery state, retry, local conversation history.
- **Scope:** private messaging only; independent of groups and transfers.
- **Depends on:** Network Core interface + Storage interface.
- **Must not own:** group internals, file transfer internals, transport implementation.
- **Testing:** mock transport for success, delay, failure, duplicates, offline peers; persistence and ordering.

## Group System

- **Responsibility:** group identity/metadata, creation, invitations, membership, join/leave, group message distribution, duplicate handling, persistence.
- **Scope:** groups over direct peer connections; no distributed coordination protocol.
- **Depends on:** Network Core interface + Storage interface.
- **Must not own:** private messaging internals, file transfer internals.
- **Testing:** mock peers for invitations, member changes, distribution, individual disconnections.

## File Transfer

- **Responsibility:** transfer metadata, direct transfer, progress, cancellation, validation, received-file management, status and errors.
- **Scope:** independent of the messaging UI; must never block chat.
- **Depends on:** Network Core interface + Storage interface.
- **Must not own:** messaging or group internals.
- **Testing:** mock transfers for success, interruption, invalid metadata, cancellation, progress, failure.

## Local Storage — implemented

- **Location:** [`modules/storage`](../../modules/storage/README.md), package `p2p_storage` (Dart, drift, SQLite).
- **Status:** storage infrastructure foundation complete and tested (51 tests); not yet integrated with an application shell or Flutter UI. Core schema currently contains settings and migration tracking; identity/conversation/message/group/file tables are not implemented yet.
- **Responsibility:** shared local persistence infrastructure for identity, settings, conversations, messages, groups, and file metadata; database lifecycle, migrations, typed settings, safe parameterized SQL, and error handling.
- **Scope:** **shared infrastructure** — one database capability, not a private store per feature module.
- **Public contract:** `Storage`, `StorageConfig`, `SettingsStore`, `SettingDefinition` helpers, `StorageMigration`, migration records/reports, and `StorageException` types, all exported from `package:p2p_storage/storage.dart`.
- **Depends on:** Foundation contracts/settings definitions only.
- **Must not own:** network, UI, or feature business logic.
- **Isolation:** the raw drift database is not exported; feature modules use the public storage API.
- **Testing:** lifecycle, restart persistence, migration ordering/rollback, settings validation/corruption, SQL errors, transactions, failure recovery.

Five agents can prepare Core, Network, Messaging, Groups, and File Transfer in parallel; Storage is shared infrastructure and its implemented boundaries are fixed. No individuals are assigned here.
