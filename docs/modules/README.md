# Planned modules

Module directories under `modules/` contain the Core & Foundation implementation and the independent private-messaging engine; the other directories are organizational placeholders for their owners. Shared contracts live in `shared/contracts`, common types in `shared/types`, and mock implementations in `shared/mocks`. Boundaries are detailed in [module boundaries](../../project/module-boundaries.md); public interfaces and handoff guidance are in [Core Foundation](../foundation.md).

## Core & Foundation

- **Responsibility:** application lifecycle, shared contracts, common types, local identity, configuration, module registration/health, events, errors, coordination.
- **Scope:** Level 0 implementation is complete: shared contracts, errors, config, logging, events, lifecycle, clock and identity; see [Core Foundation](../foundation.md).
- **Depends on:** platform/storage interfaces it defines itself; nothing else.
- **Must not own:** networking, chat rules, group rules, transfer logic, UI widgets.
- **Testing:** lifecycle, identity persistence contract, module init/failure isolation, event contracts — implemented in `tests/`.

## Peer Discovery & Network Core

- **Responsibility:** local discovery, peer registry, identity exchange, direct connections, heartbeats, availability, reconnection, network events, platform adapters.
- **Scope:** transport and connection state only.
- **Depends on:** Foundation.
- **Must not own:** UI, message/group/file business logic.
- **Testing:** mocked discovery, connect/fail/disconnect/reconnect, duplicate and leaving peers.

## Messaging Engine

- **Responsibility:** private messages, IDs, send/receive, ordering, duplicate detection, delivery state, retry, local conversation history.
- **Scope:** private messaging only; independent of groups and transfers. Implemented in `modules/messaging` as `MessagingEngine`.
- **Depends on:** Network Core interface + Storage interface + Core identity, IDs, clock, events and logger.
- **Must not own:** group internals, file transfer internals, transport implementation, UI rendering or durable database code.
- **Testing:** `tests/messaging.test.ts` covers success, failed send and retry, incoming ordering, duplicate suppression, receipts, malformed payloads and shutdown using mock network/storage.

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

Five agents can prepare Core, Network, Messaging, Groups, and File Transfer in parallel; Storage is shared infrastructure with boundaries agreed before implementation. Core, its contracts and its mocks are implemented, and the messaging engine is implemented independently. The other module directories remain unassigned placeholders.
