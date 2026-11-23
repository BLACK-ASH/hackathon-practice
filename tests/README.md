# Testing approach (planned)

No tests exist yet. This document records the intended levels; actual test tooling is chosen later with the technology stack.

- **Unit tests** — pure logic in isolation: IDs, validation, message ordering, deduplication, metadata checks.
- **Module tests** — one module at a time through its public interface, with its dependencies mocked; verifies module health and failure isolation.
- **Integration tests** — modules working together through stable contracts (messaging + network + storage, groups + network, transfers + storage).
- **Mock tests** — explicit scenarios: discovery/connect/disconnect/reconnect; delayed, failed, duplicated, and offline-peer messages; group invites and partial failures; interrupted, invalid, cancelled, and progressing transfers.
- **Cross-device LAN tests** — real supported devices on ordinary Wi-Fi/hotspots, including restrictive networks; verifies discovery, direct messaging, groups, and file sharing without internet.
- **Failure and recovery tests** — network loss, peer disappearance, storage corruption/errors, missing platform permissions or capabilities, and recovery paths; confirms other modules keep working.

Tests must describe actual behavior, and a feature is not "done" until it is tested. Mobile/desktop layout and touch interaction are validated in M6.
