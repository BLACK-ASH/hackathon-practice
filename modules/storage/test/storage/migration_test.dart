import 'package:p2p_storage/storage.dart';
import 'package:test/test.dart';

import 'helpers.dart';

StorageMigration notesMigration(
    [int version = 2, String name = 'create_notes']) {
  return sqlMigration(version, name, [
    'CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL)',
  ]);
}

void main() {
  group('migration definitions', () {
    test('migrations are sorted and validated', () {
      final migrations = <StorageMigration>[
        sqlMigration(3, 'third', ['SELECT 3']),
        sqlMigration(1, 'first', ['SELECT 1']),
        sqlMigration(2, 'second', ['SELECT 2']),
      ];
      final runner = MigrationRunner(migrations);

      expect(runner.migrations.map((item) => item.version), [1, 2, 3]);
    });

    test('duplicate versions are rejected', () {
      expect(
        () => MigrationRunner(<StorageMigration>[
          sqlMigration(2, 'first', ['SELECT 1']),
          sqlMigration(2, 'second', ['SELECT 2']),
        ]),
        throwsA(isA<StorageConfigurationException>()),
      );
    });

    test('invalid migration definitions are rejected', () {
      expect(
        () => StorageMigration(version: 0, name: 'zero', apply: (_) async {}),
        throwsA(isA<StorageConfigurationException>()),
      );
      expect(
        () => StorageMigration(version: 1, name: '', apply: (_) async {}),
        throwsA(isA<StorageConfigurationException>()),
      );
      expect(
        () => sqlMigration(1, 'empty', const []),
        throwsA(isA<StorageConfigurationException>()),
      );
    });

    test('duplicate versions in config fail before opening', () {
      final workspace = TestWorkspace();
      addTearDown(workspace.dispose);
      final storage = Storage(
        workspace.config(migrations: [notesMigration(), notesMigration()]),
      );

      expect(
        storage.initialize(),
        throwsA(isA<StorageConfigurationException>()),
      );
    });
  });

  group('migration execution', () {
    late TestWorkspace workspace;

    setUp(() {
      workspace = TestWorkspace();
    });

    tearDown(() {
      workspace.dispose();
    });

    test('initial migration is applied once', () async {
      final storage = await Storage.inMemory();

      expect(storage.schemaVersion, coreSchemaVersion);
      final applied = await storage.appliedMigrations();
      expect(applied.map((item) => item.version), [1]);
      expect(applied.single.name, 'create_settings_table');
      await storage.close();
    });

    test('multiple migrations run in order', () async {
      final storage = await Storage.inMemory(
        config: StorageConfig(
          additionalMigrations: [
            sqlMigration(3, 'create_tags', [
              'CREATE TABLE tags (id INTEGER PRIMARY KEY)',
            ]),
            notesMigration(),
          ],
        ),
      );

      expect(storage.schemaVersion, 3);
      final applied = await storage.appliedMigrations();
      expect(applied.map((item) => item.version), [1, 2, 3]);
      expect(
        applied.map((item) => item.name),
        ['create_settings_table', 'create_notes', 'create_tags'],
      );
      await storage.close();
    });

    test('reopen does not reapply recorded migrations', () async {
      final first =
          await Storage(workspace.config(migrations: [notesMigration()]))
              .initialize();
      await first.close();

      final second = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();
      expect((await second.appliedMigrations()).length, 2);
      expect(second.schemaVersion, 2);
      await second.execute('INSERT INTO notes (title) VALUES (?)', ['kept']);
      expect((await second.queryAll('SELECT title FROM notes')).single['title'],
          'kept');
      await second.close();
    });

    test('migrations can be added after initialization', () async {
      final storage = await Storage.inMemory();
      final migration = notesMigration(20, 'late_notes');

      final report = await storage.applyMigrations([migration]);
      expect(report.applied, [20]);
      expect(report.schemaVersion, 20);

      final repeated = await storage.applyMigrations([migration]);
      expect(repeated.applied, isEmpty);
      expect(repeated.schemaVersion, 20);
      expect((await storage.appliedMigrations()).length, 2);
      await storage.close();
    });

    test('failed SQL migration rolls back', () async {
      final failing = sqlMigration(2, 'broken', [
        'CREATE TABLE broken (id INTEGER PRIMARY KEY)',
        'THIS IS NOT VALID SQL',
      ]);
      final storage = Storage(workspace.config(migrations: [failing]));

      await expectLater(
        storage.initialize(),
        throwsA(isA<MigrationException>()),
      );

      final recovered = await Storage(workspace.config()).initialize();
      final tables = await recovered.queryAll(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      );
      expect(tables.map((row) => row['name']), isNot(contains('broken')));
      expect((await recovered.appliedMigrations()).length, 1);
      await recovered.close();
    });

    test('failed callable migration rolls back', () async {
      final failing = StorageMigration(
        version: 2,
        name: 'broken_callable',
        apply: (context) async {
          await context.execute(
            'CREATE TABLE broken (id INTEGER PRIMARY KEY)',
          );
          throw StateError('simulated migration failure');
        },
      );
      final storage = Storage(workspace.config(migrations: [failing]));

      await expectLater(
        storage.initialize(),
        throwsA(isA<MigrationException>()),
      );

      final recovered = await Storage(workspace.config()).initialize();
      final tables = await recovered.queryAll(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      );
      expect(tables.map((row) => row['name']), isNot(contains('broken')));
      await recovered.close();
    });

    test('changed migration name is rejected', () async {
      final first = await Storage(
        workspace.config(migrations: [notesMigration(2, 'original')]),
      ).initialize();
      await first.close();

      final changed = Storage(
        workspace.config(migrations: [notesMigration(2, 'renamed')]),
      );
      await expectLater(
        changed.initialize(),
        throwsA(isA<MigrationException>()),
      );
    });

    test('late migration older than current schema is rejected', () async {
      final first = await Storage(
        workspace.config(
          migrations: [
            sqlMigration(3, 'future', [
              'CREATE TABLE future (id INTEGER PRIMARY KEY)',
            ]),
          ],
        ),
      ).initialize();
      await first.close();

      final late = Storage(workspace.config(migrations: [notesMigration()]));
      await expectLater(
        late.initialize(),
        throwsA(isA<MigrationException>()),
      );
    });
  });
}
