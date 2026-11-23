# 0001 — Technology Stack

- **Status:** Accepted
- **Date:** 2026-11-23
- **Scope:** Approved baseline for the P2P LAN Messenger implementation.

## Decision

Use Flutter and Dart to build native desktop and mobile applications with Bonsoir-based mDNS/DNS-SD discovery, direct Dart TCP sockets for peer communication, UTF-8 JSON control messages with length-prefixed framing, SQLite via Drift for local persistence, and Flutter's built-in `ChangeNotifier` / `ValueNotifier` for state management.

## Context

The application must work offline on a local network with no central messaging server, no account system, and no internet dependency. It must support Linux, Windows, macOS, Android, and iOS from a shared codebase while keeping platform-specific behavior behind adapters. The team is working to a hackathon timeline, so dependencies must be few, well understood, and independently testable through mocks. Scaffolding documentation deliberately left the stack open; this record closes that gap for the baseline stack only.

## Alternatives considered

- **Web-hosted or centralized client/server messaging** — rejected because the product requires no central application server and must work without internet.
- **Separate native applications per platform** — rejected because it duplicates core logic and conflicts with the shared-codebase goal.
- **Additional state-management packages** — deferred: `ChangeNotifier` / `ValueNotifier` are sufficient to start, and a new dependency must be justified later.
- **Encrypted-transport selection** — not considered here; explicitly deferred (see below).

## Reasoning

Flutter provides one codebase across the five target platforms with native desktop and mobile builds. Bonsoir provides cross-platform mDNS/DNS-SD discovery over service type `_p2plm._tcp`; devices advertise their own peer service rather than relying on a directory. Dart `ServerSocket` / `Socket` give direct, bidirectional TCP communication without a relay. Length-prefixed UTF-8 JSON is simple to implement, inspect, and validate through shared contracts. Drift supplies typed SQLite access with local-only storage. Built-in notifiers avoid early dependency growth.

## Consequences

### Approved baseline

- **Application framework:** Flutter + Dart; native desktop and mobile applications only. No web-hosted application dependency.
- **Peer discovery:** Bonsoir with mDNS / DNS-SD, service type `_p2plm._tcp`. Each device advertises its own peer service.
- **Direct transport:** Dart `ServerSocket` and `Socket` over direct TCP. Devices both listen for incoming connections and initiate outgoing connections. No central application server.
- **Messaging protocol direction:** UTF-8 JSON control messages with length-prefixed framing over TCP. The exact frame format, size limits, and schema belong in shared contracts and are not defined here.
- **Local persistence:** SQLite accessed through Drift.
- **State management:** Start with `ChangeNotifier` / `ValueNotifier`; add no other state-management dependency without justification.

### Platform constraints

1. Linux requires Avahi for Bonsoir-based discovery.
2. iOS needs appropriate local-network privacy configuration and Bonjour service declarations.
3. Android targeting API 37 or later requires `ACCESS_LOCAL_NETWORK` handling for broad LAN access.
4. Windows and macOS require platform-specific build environments.
5. Bonsoir peer discovery must be validated using physical Android devices, not only an emulator.
6. Mobile background networking is outside the initial MVP scope.

### Security requirement

The application must not claim that communication is secure or encrypted until peer authentication and authenticated encryption have been implemented and verified. The actual security protocol remains a decision requiring a separate architecture review. No cryptography is implemented by this decision.

### Development priorities

1. Application foundation.
2. Real LAN discovery.
3. Direct device connections.
4. Reliable private messaging.
5. Local conversation persistence.
6. Group conversations.
7. File sharing.
8. Reliability and additional UX.

The first demonstration must prioritize two physical devices exchanging messages without internet.

### Explicitly deferred decisions

These are not decided by this record and require later technical decisions:

- Encryption and key exchange protocol.
- Exact TCP frame schema and frame-size limits.
- Background networking strategy.
- File-transfer protocol.
- Platform-specific minimum versions beyond documented dependency requirements.
- Firewall port configuration.

## Validation

This decision selects technologies and records constraints only. It creates no application code, protocol implementation, platform configuration, or dependency installation.
