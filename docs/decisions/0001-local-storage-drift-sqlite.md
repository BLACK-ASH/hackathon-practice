# 0001 — Local storage uses Dart + drift over SQLite

- **Status:** Accepted
- **Date:** 2026-11-23

## Decision

Implement the shared local storage foundation as an independent Dart package in `modules/storage` using drift and SQLite.

## Context

The messenger must persist identity, settings, conversations, messages, groups, and file metadata locally, work fully offline, survive restarts, and support desktop and mobile targets from one codebase. The application stack is Dart/Flutter-oriented, but storage must remain independently testable without a UI. Storage is shared infrastructure rather than a database owned by each feature module.

At the time of this decision the repository contained documentation placeholders only; no application framework or database dependency existed. The implementation therefore starts with the storage foundation and a pure Dart test suite.

## Alternatives considered

- **sqflite** — mature on Flutter mobile, but tied to Flutter and weaker for desktop-only Dart tests and typed queries.
- **Hive / Isar** — convenient key-value/object stores, but less direct SQL control for relational conversation, group, and file records, and additional migration restrictions.
- **shared_preferences** — suitable for a few settings only; unsuitable as the shared database.
- **Raw `sqlite3` calls** — smaller dependency surface, but requires hand-written query mapping, migration bookkeeping, and more unsafe string handling.
- **One database per feature module** — rejected because storage is shared infrastructure and would complicate backup, migrations, and cross-feature queries.

## Reasoning

drift provides typed schema definitions, generated query support, parameter binding, transactions, and migration tooling while still running on SQLite. Keeping it inside a Dart package avoids a Flutter dependency in the storage core, allows fast `dart test` coverage, and lets a future Flutter shell supply the platform database path and native SQLite packaging. A single public `Storage` facade hides the drift internals from feature modules.

## Consequences

- `dart run build_runner build` is required after changing the drift schema; generated code is committed with the package.
- SQLite native libraries must be packaged per platform when integrated into Flutter; only the Dart/Windows test path is verified so far.
- Schema changes must be coordinated centrally: one global migration sequence, not per-feature databases.
- The raw database class stays unexported; features use `Storage`, `SettingsStore`, and migration contracts.
- Database encryption, secure key storage, full-text search, and backup/export are not included in this foundation and need later decisions.
