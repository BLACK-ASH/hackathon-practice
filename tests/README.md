# Testing approach

Tests describe actual behavior; a feature is not "done" until it is tested. Local Storage is implemented and tested at the module level; other modules remain planned.

## Implemented storage tests

Run from `modules/storage`:

```powershell
dart pub get
dart analyze
dart test
```

The storage suite uses `package:test`, temporary file databases, and in-memory SQLite databases. It covers:

- Database lifecycle, readiness, idempotent close, and post-close rejection.
- File creation, nested directories, restart persistence, and initialization failure/retry.
- Core and additional migrations, ordering, recording, re-open behavior, late migrations, changed names, and rollback on SQL/Dart failures.
- Typed settings defaults, validation, update/delete/reset, JSON values, corrupt values, and recovery.
- Parameterized SQL, missing rows, constraint/SQL failures, transactions, and rollback.
- Repeated operations and isolation between temporary workspaces.

Verified on Windows with Dart 3.14.1: `dart analyze` reports no issues and all 51 tests pass. SQLite native assets were resolved by the Dart test runner; Flutter/mobile packaging is not yet verified.

## Planned levels for other modules

- **Unit tests** — pure logic in isolation: IDs, validation, message ordering, deduplication, metadata checks.
- **Module tests** — one module at a time through its public interface, with dependencies mocked; verifies module health and failure isolation.
- **Integration tests** — modules working together through stable contracts (messaging + network + storage, groups + network, transfers + storage).
- **Mock tests** — discovery/connect/disconnect/reconnect; delayed, failed, duplicated, and offline-peer messages; group invites and partial failures; interrupted, invalid, cancelled, and progressing transfers.
- **Cross-device LAN tests** — real supported devices on ordinary Wi-Fi/hotspots, including restrictive networks.
- **Failure and recovery tests** — network loss, peer disappearance, storage corruption/errors, missing platform permissions or capabilities, and recovery paths.

Mobile/desktop layout and touch interaction are validated in M6.
