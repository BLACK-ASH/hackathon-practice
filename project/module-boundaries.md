# Module boundaries

Authoritative boundary reference; see [docs/modules](../docs/modules/README.md) for module responsibilities and [AGENTS.md](../AGENTS.md) for the full rules.

## Allowed dependencies

- Application shell → module interfaces.
- Messaging → Network Core interface + Storage interface.
- Groups → Network Core interface + Storage interface.
- File Transfer → Network Core interface + Storage interface.
- Network Core → Foundation.
- Storage → Foundation.
- Feature modules → shared contracts where necessary.

## Prohibited dependencies

- Messaging → Group System internals (and vice versa).
- File Transfer → Messaging internals; any feature → unrelated feature internals.
- Network Core → UI or chat business logic.
- Circular dependencies of any kind.

## Shared contracts

Interfaces and common types belong in `shared/contracts` and `shared/types`, agreed before implementation. Modules communicate through those contracts and events. Platform-specific behavior sits behind adapters with graceful fallbacks; mock implementations satisfy the same contracts as real ones.

## Module isolation

Each module initializes independently, reports health/status, uses timeouts, and contains failures locally. Discovery loss, a dead peer, storage errors, or a missing platform capability must not crash the app or take down other modules. Errors are surfaced, never silently ignored or leaked as raw network details to users.

Local Storage is **shared infrastructure**: identity, settings, conversations, messages, groups, and file metadata use one documented storage capability, not per-module independent databases.

The implemented storage module is `modules/storage` (`p2p_storage`). Its contract is exported from `package:p2p_storage/storage.dart`: `Storage` lifecycle/health, `StorageConfig`, `SettingsStore` and setting definitions, migration types/reports, and storage exception types. The internal drift database is deliberately not exported. Feature modules must not create private databases, import storage `src/` files, or bypass parameterized SQL helpers.

Schema changes are coordinated centrally through the storage owner. Feature teams provide migration definitions or required columns; versions remain globally unique and ordered. Database paths and raw SQL errors stay out of user-facing UI.

## Independent development and testing

Parallel work is organized around Core & Foundation, Network Core, Messaging Engine, Group System, and File Transfer; Storage is shared infrastructure with its foundation implemented and boundaries fixed. Every module must be buildable/testable alone using mocks, and integration happens incrementally through `dev`. Other application modules still have no implementation files.
