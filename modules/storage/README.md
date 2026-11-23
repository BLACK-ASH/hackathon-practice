# Local Storage (`p2p_storage`)

Independent Dart package providing the offline-first SQLite persistence foundation for the P2P LAN Messenger. It owns the database lifecycle, schema migrations, typed settings, and safe SQL access; it contains no network, messaging, group, transfer, or UI logic.

Implementation status: **complete for the storage foundation scope and tested with 51 passing Dart tests.** It is not yet wired into an application shell or Flutter UI.

## Public API

Import the facade only:

```dart
import 'package:p2p_storage/storage.dart';

final storage = await Storage(
  StorageConfig(
    databasePath: '/path/to/storage.db',
    settingDefinitions: [stringSetting('app.theme', defaultValue: 'system')],
  ),
).initialize();

await storage.settings.set('app.theme', 'dark');
final theme = await storage.settings.get<String>('app.theme');
await storage.close();
```

For tests and demos, use the initialized in-memory helper:

```dart
final storage = await Storage.inMemory();
```

### Lifecycle

- `Storage(config)` creates an uninitialized instance.
- `initialize()` opens the database, applies migrations, creates the settings store, and returns `Future<Storage>`.
- `close()` is idempotent.
- `state`, `isReady`, `health()`, `schemaVersion`, and `databasePath` expose safe status.
- Operations before `initialize()` or after `close()` throw `StorageNotInitializedException`.

### Configuration

`StorageConfig` supports:

- `databasePath` — explicit database file; defaults to the platform application data directory.
- `appName` — directory name used by the default path.
- `busyTimeoutMs` — SQLite busy timeout, default `5000`.
- `enableWal` — WAL journaling for file databases, default `true`.
- `additionalMigrations` — extra global schema migrations.
- `settingDefinitions` — typed settings known by the application.

`P2P_LAN_MESSENGER_DATA_DIR` overrides the default data directory for tests or portable deployments.
Default locations are `%APPDATA%/<appName>` on Windows, `~/Library/Application Support/<appName>` on macOS, and `$XDG_DATA_HOME/<appName>` or `~/.local/share/<appName>` on Linux. Android and iOS require an explicit application-sandbox `databasePath` from the app shell.

### Settings

`SettingsStore` provides:

- `define`, `defineMany`, `isDefined`, `definitions`
- `get<T>`, `getOrDefault<T>`, `has`, `count`, `getAll`
- `set`, `update`, `delete`, `reset`, `resetAll`

Definitions can be built with `stringSetting`, `integerSetting`, `booleanSetting`, and `jsonSetting`. Defaults are validated, immutable from callers, and returned when the setting is not stored. Stored values are JSON encoded; invalid or corrupt values throw `CorruptedSettingException` and can be repaired by writing the setting again.

### SQL access

`Storage` exposes parameterized helpers only:

- `execute(sql, [variables])`
- `update(sql, [variables])`
- `queryAll(sql, [variables])`
- `queryOne(sql, [variables])`
- `scalar(sql, [variables])`
- `transaction((session) async { ... })`

The raw `StorageDatabase` is not exported and must not be accessed by feature modules. Transactions roll back on failure, including failed writes.

### Migrations

- `coreSchemaVersion` is currently `1`.
- Core migration `1` creates the `settings` table and `schema_migrations`.
- `sqlMigration(version, name, statements)` creates a recorded SQL migration.
- `StorageMigration` supports custom async Dart logic through `StorageMigrationContext`.
- Migrations must have unique versions and non-empty names; failures roll back and are recorded only after success.
- Recorded migrations cannot be renamed or skipped. Extra migrations added after initialization run through `applyMigrations`.
- Feature teams register migrations through `StorageConfig.additionalMigrations`; there is one shared global schema, not a database per feature.

## Schema

Core schema version 1 contains the settings table and migration tracking:

```sql
CREATE TABLE settings (
  key TEXT NOT NULL PRIMARY KEY CHECK (length(key) > 0 AND length(key) <= 128),
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE schema_migrations (
  version INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
```

Identity, conversation, message, group, member, and file-metadata tables are **not implemented yet**. They will be added through the same coordinated migration pipeline by the owning feature slices; this foundation provides the shared database, migration safety, typed settings, and parameterized SQL needed for them. Feature modules must not create separate databases.

## Errors

All defined failures derive from `StorageException`:

- `StorageConfigurationException`
- `StorageInitializationException`
- `StorageNotInitializedException`
- `DatabaseOperationException`
- `MigrationException`
- `SettingException`, `SettingNotFoundException`, `InvalidSettingException`, `CorruptedSettingException`

Feature modules should map these into their own user-facing error states; they must not expose raw SQL or file paths to end users.

## Development

```powershell
dart pub get
dart analyze
dart test
dart run example/storage_demo.dart
```

Regenerate drift code after changing `database.dart`:

```powershell
dart run build_runner build --delete-conflicting-outputs
```

Tests use temporary file databases and in-memory databases; the suite covers lifecycle, persistence, settings validation/corruption, migrations and rollback, transactions, SQL failures, and restart/recovery scenarios.

### Independent demonstration

`example/storage_demo.dart` exercises the real file-backed implementation without any other module:

1. Creates a temporary database and applies migrations.
2. Saves and reads settings.
3. Updates a setting.
4. Closes storage.
5. Reopens the same database file and confirms the updated value survived.
6. Resets a setting to its default, clears all stored settings, and verifies that defaults are still available.

It prints `DEMO PASSED` and exits successfully, or throws on any unexpected result. The temporary directory is removed when the demonstration finishes.

```powershell
dart run example/storage_demo.dart
```

## Application integration contract

- Add this package as a path dependency: `p2p_storage: { path: ../../modules/storage }`.
- The app shell owns `Storage` lifecycle: construct with an application data path, `await initialize()`, expose health/status, and close on shutdown.
- Foundation/identity modules define their settings through `SettingDefinition` instances supplied in `StorageConfig`.
- Messaging, groups, and file transfer must access persistence through this package and its public helpers/contracts, not through their own SQLite databases or the internal database class.
- Schema changes are coordinated centrally so migration versions stay unique and ordered.
- Flutter/mobile native SQLite packaging still needs an app-level integration step (for example platform SQLite libraries); only the Dart package has been verified on Windows with the Dart SDK.

## Verified environment

- Dart SDK 3.14.1, Windows.
- `drift 2.35.4`, `drift_dev 2.35.3`, `sqlite3 3.9.2`.
- `dart analyze`: no issues.
- `dart test`: 51 tests passed.
