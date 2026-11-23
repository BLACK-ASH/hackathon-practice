import 'dart:io';

import 'package:p2p_storage/storage.dart';
import 'package:test/test.dart';

import 'helpers.dart';

StorageMigration notesMigration() {
  return sqlMigration(
    10,
    'reliable_notes',
    ['CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL)'],
  );
}

void main() {
  group('reliability', () {
    late TestWorkspace workspace;

    setUp(() {
      workspace = TestWorkspace();
    });

    tearDown(() {
      workspace.dispose();
    });

    test('application restart simulation', () async {
      final config = workspace.config(definitions: appDefinitions());

      for (final theme in ['dark', 'light', 'system']) {
        final storage = await Storage(config).initialize();
        await storage.settings.set('app.theme', theme);
        expect(storage.schemaVersion, coreSchemaVersion);
        expect((await storage.appliedMigrations()).length, 1);
        await storage.close();
      }

      final finalStorage = await Storage(config).initialize();
      expect(await finalStorage.settings.get<String>('app.theme'), 'system');
      expect((await finalStorage.appliedMigrations()).length, 1);
      await finalStorage.close();
    });

    test('reinitialization after initialization failure', () async {
      final blocked = File('${workspace.directory.path}/blocked')
        ..writeAsStringSync('not a directory');
      final failed = Storage(
        workspace.config(path: '${blocked.path}/storage.db'),
      );

      await expectLater(
        failed.initialize(),
        throwsA(isA<StorageInitializationException>()),
      );
      expect(failed.state, StorageState.failed);

      blocked.deleteSync();
      final recovered = await Storage(workspace.config()).initialize();
      expect(recovered.isReady, isTrue);
      await recovered.settings.set('recovery.ok', true);
      expect(await recovered.settings.get<bool>('recovery.ok'), isTrue);
      await recovered.close();
    });

    test('repeated operations remain consistent', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();

      for (var index = 0; index < 100; index++) {
        final key = 'loop.key_$index';
        await storage.settings.set(key, index);
        await storage.execute('INSERT INTO notes (title) VALUES (?)', [key]);
      }

      expect(await storage.settings.count(), 100);
      expect(await storage.scalar('SELECT COUNT(*) AS total FROM notes'), 100);
      for (var index = 0; index < 100; index++) {
        expect(await storage.settings.get<int>('loop.key_$index'), index);
      }
      expect((await storage.settings.getAll()).length, 100);
      await storage.close();
    });

    test('failed transaction does not damage existing data', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();
      await storage.settings.set('stable.key', 'unchanged');
      await storage.execute('INSERT INTO notes (title) VALUES (?)', ['stable']);

      await expectLater(
        storage.transaction((session) async {
          await session.execute('DELETE FROM notes');
          await session.execute(
            'UPDATE settings SET value = ? WHERE key = ?',
            ['"changed"', 'stable.key'],
          );
          throw StateError('simulated interruption');
        }),
        throwsA(isA<DatabaseOperationException>()),
      );

      expect(await storage.settings.get<String>('stable.key'), 'unchanged');
      expect(
        await storage.queryAll('SELECT title FROM notes'),
        [
          {'title': 'stable'}
        ],
      );
      await storage.close();
    });

    test('corrupted setting recovers without losing other data', () async {
      final config = workspace.config(definitions: appDefinitions());
      final first = await Storage(config).initialize();
      await first.settings.set('app.theme', 'dark');
      await first.settings.set('app.font_size', 18);
      await first.execute(
        'UPDATE settings SET value = ? WHERE key = ?',
        ['{broken', 'app.theme'],
      );

      expect(
        () => first.settings.get<String>('app.theme'),
        throwsA(isA<CorruptedSettingException>()),
      );
      expect(await first.settings.get<int>('app.font_size'), 18);

      await first.settings.set('app.theme', 'light');
      await first.close();

      final second = await Storage(config).initialize();
      expect(await second.settings.get<String>('app.theme'), 'light');
      expect(await second.settings.get<int>('app.font_size'), 18);
      await second.close();
    });

    test('failed migration can be replaced on next initialization', () async {
      final broken = sqlMigration(2, 'broken', [
        'CREATE TABLE broken (id INTEGER PRIMARY KEY)',
        'INVALID SQL',
      ]);
      final first = Storage(workspace.config(migrations: [broken]));

      await expectLater(
        first.initialize(),
        throwsA(isA<MigrationException>()),
      );

      final recovered = await Storage(
        workspace.config(
          migrations: [
            sqlMigration(2, 'recovered', [
              'CREATE TABLE recovered (id INTEGER PRIMARY KEY)',
            ]),
          ],
        ),
      ).initialize();
      expect(recovered.schemaVersion, 2);
      expect(
        (await recovered.appliedMigrations()).map((item) => item.name),
        ['create_settings_table', 'recovered'],
      );
      await recovered.close();
    });

    test('database file is created in the selected directory', () async {
      final selected = '${workspace.directory.path}/custom/app.db';
      final storage =
          await Storage(workspace.config(path: selected)).initialize();

      expect(storage.databasePath, selected);
      expect(File(selected).existsSync(), isTrue);
      expect(storage.health().databasePath, selected);
      await storage.close();
    });
  });
}
