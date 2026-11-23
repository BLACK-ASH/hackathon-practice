import 'package:drift/drift.dart';

import 'database.dart';
import 'errors.dart';

const _migrationsTable = 'schema_migrations';

const _createMigrationsTableSql = '''
CREATE TABLE IF NOT EXISTS $_migrationsTable (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
)
''';

typedef StorageMigrationApply = Future<void> Function(
  StorageMigrationContext context,
);

class StorageMigration {
  StorageMigration({
    required this.version,
    required this.name,
    required this.apply,
  }) {
    if (version <= 0) {
      throw StorageConfigurationException(
        'Migration version must be greater than zero',
      );
    }
    if (name.trim().isEmpty) {
      throw StorageConfigurationException(
        'Migration name must be a non-empty string',
      );
    }
  }

  final int version;
  final String name;
  final StorageMigrationApply apply;
}

StorageMigration sqlMigration(
  int version,
  String name,
  List<String> statements,
) {
  if (statements.isEmpty) {
    throw StorageConfigurationException(
      "Migration $version ('$name') must contain at least one statement",
    );
  }
  return StorageMigration(
    version: version,
    name: name,
    apply: (StorageMigrationContext context) async {
      for (final statement in statements) {
        await context.execute(statement);
      }
    },
  );
}

class StorageMigrationContext {
  StorageMigrationContext(this._database);

  final StorageDatabase _database;

  Future<void> execute(
    String sql, [
    List<Object?> variables = const [],
  ]) {
    return _database.customStatement(sql, variables);
  }

  Future<List<Map<String, Object?>>> query(
    String sql, [
    List<Object?> variables = const [],
  ]) async {
    final rows = await _database
        .customSelect(sql, variables: _variables(variables))
        .get();
    return rows.map((QueryRow row) => row.data).toList(growable: false);
  }
}

class AppliedMigration {
  const AppliedMigration({
    required this.version,
    required this.name,
    required this.appliedAt,
  });

  final int version;
  final String name;
  final String appliedAt;
}

class MigrationReport {
  const MigrationReport({required this.applied, required this.schemaVersion});

  final List<int> applied;
  final int schemaVersion;
}

class MigrationRunner {
  MigrationRunner(Iterable<StorageMigration> migrations)
      : migrations = _validate(migrations);

  final List<StorageMigration> migrations;

  Future<MigrationReport> run(StorageDatabase database) async {
    try {
      await database.customStatement(_createMigrationsTableSql);
      final applied = await readAppliedMigrations(database);
      final appliedByVersion = {
        for (final migration in applied) migration.version: migration,
      };

      for (final migration in migrations) {
        final existing = appliedByVersion[migration.version];
        if (existing != null && existing.name != migration.name) {
          throw MigrationException(
            'Migration ${migration.version} was previously applied as '
            "'${existing.name}' but is now named '${migration.name}'",
          );
        }
      }

      final maxApplied = applied.isEmpty ? 0 : applied.last.version;
      final pending = migrations
          .where((StorageMigration migration) =>
              !appliedByVersion.containsKey(migration.version))
          .toList(growable: false);

      for (final migration in pending) {
        if (migration.version < maxApplied) {
          throw MigrationException(
            'Migration ${migration.version} is older than the already applied '
            'schema version $maxApplied',
          );
        }
      }

      final appliedNow = <int>[];
      for (final migration in pending) {
        await database.transaction(() async {
          try {
            await migration.apply(StorageMigrationContext(database));
            await database.customStatement(
              'INSERT INTO $_migrationsTable (version, name, applied_at) '
              'VALUES (?, ?, ?)',
              [migration.version, migration.name, _now()],
            );
          } on MigrationException {
            rethrow;
          } catch (error) {
            throw MigrationException(
              "Migration ${migration.version} ('${migration.name}') failed "
              'and was rolled back',
              cause: error,
            );
          }
        });
        appliedNow.add(migration.version);
      }

      final finalApplied = await readAppliedMigrations(database);
      return MigrationReport(
        applied: List<int>.unmodifiable(appliedNow),
        schemaVersion: finalApplied.isEmpty ? 0 : finalApplied.last.version,
      );
    } on StorageException {
      rethrow;
    } catch (error) {
      throw MigrationException(
        'Failed to apply local database migrations',
        cause: error,
      );
    }
  }
}

Future<List<AppliedMigration>> readAppliedMigrations(
  StorageDatabase database,
) async {
  try {
    final rows = await database
        .customSelect(
          'SELECT version, name, applied_at FROM $_migrationsTable ORDER BY version',
        )
        .get();
    return List<AppliedMigration>.unmodifiable(
      rows.map((QueryRow row) {
        final Map<String, Object?> data = row.data;
        return AppliedMigration(
          version: data['version']! as int,
          name: data['name']! as String,
          appliedAt: data['applied_at']! as String,
        );
      }),
    );
  } on StorageException {
    rethrow;
  } catch (error) {
    throw MigrationException(
      'Failed to read applied local database migrations',
      cause: error,
    );
  }
}

List<StorageMigration> _validate(Iterable<StorageMigration> migrations) {
  final validated = migrations.toList(growable: false)
    ..sort((StorageMigration a, StorageMigration b) =>
        a.version.compareTo(b.version));
  final seen = <int, StorageMigration>{};
  for (final migration in validated) {
    final existing = seen[migration.version];
    if (existing != null) {
      throw StorageConfigurationException(
        'Duplicate migration version ${migration.version}: '
        "'${existing.name}' and '${migration.name}'",
      );
    }
    seen[migration.version] = migration;
  }
  return List<StorageMigration>.unmodifiable(validated);
}

List<Variable<Object>> _variables(List<Object?> values) {
  return values
      .map((Object? value) => Variable<Object>(value))
      .toList(growable: false);
}

String _now() => DateTime.now().toUtc().toIso8601String();
