# Modules

Feature module directories remain organizational placeholders. Level 0 foundation is implemented in `lib/src/foundation/` and in the local `p2p_lan_messenger_shared` package under `shared/lib/`. Boundaries are detailed in [module boundaries](../../project/module-boundaries.md).

## Core & Foundation

- **Responsibility:** application lifecycle, shared contracts, common types, local identity, configuration, module registration/health, events, errors, coordination.
- **Status:** Level 0 implemented and tested; production network/storage adapters and feature modules are not implemented.
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

## Local Storage

- **Responsibility:** shared local persistence for identity, settings, conversations, messages, groups, and file metadata; data access interfaces and error handling.
- **Scope:** **shared infrastructure** — one documented storage capability, not a private store per feature module.
- **Depends on:** Foundation.
- **Must not own:** network or feature business logic.
- **Testing:** persistence across restarts, malformed/corrupt data handling, failure reporting and recovery.

Five agents can prepare Core, Network, Messaging, Groups, and File Transfer in parallel; Storage is shared infrastructure with boundaries agreed before implementation. No individuals are assigned here.
