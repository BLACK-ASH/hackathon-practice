import 'dart:io';

import 'package:p2p_storage/storage.dart';
import 'package:path/path.dart' as p;
import 'package:test/test.dart';

import 'helpers.dart';

void main() {
  group('database lifecycle', () {
    late TestWorkspace workspace;

    setUp(() {
      workspace = TestWorkspace();
    });

    tearDown(() {
      workspace.dispose();
    });

    test('initial creation creates the database, schema, and health', () async {
      final storage = await Storage(workspace.config()).initialize();

      expect(File(workspace.databasePath).existsSync(), isTrue);
      expect(storage.schemaVersion, coreSchemaVersion);
      expect(storage.state, StorageState.ready);
      expect(storage.isReady, isTrue);

      final health = storage.health();
      expect(health.state, StorageState.ready);
      expect(health.schemaVersion, coreSchemaVersion);
      expect(health.databasePath, workspace.databasePath);
      expect(health.error, isNull);

      final applied = await storage.appliedMigrations();
      expect(applied.map((item) => item.version), [1]);
      expect(applied.single.name, 'create_settings_table');
      expect(applied.single.appliedAt, isNotEmpty);

      await storage.close();
    });

    test('expected tables exist', () async {
      final storage = await Storage(workspace.config()).initialize();
      final tables = await storage.queryAll(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      );

      expect(
        tables.map((row) => row['name']),
        containsAll(<String>['schema_migrations', 'settings']),
      );
      await storage.close();
    });

    test('repeated initialization is idempotent', () async {
      final storage = await Storage(workspace.config()).initialize();
      await storage.initialize();
      await storage.initialize();

      expect(storage.schemaVersion, coreSchemaVersion);
      expect((await storage.appliedMigrations()).length, 1);
      await storage.close();
    });

    test('database reopening preserves data', () async {
      final first = await Storage(workspace.config()).initialize();
      await first.settings.set('custom.value', 'kept');
      await first.close();

      final second = await Storage(workspace.config()).initialize();
      expect(await second.settings.get<String>('custom.value'), 'kept');
      expect((await second.appliedMigrations()).length, 1);
      await second.close();
    });

    test('close is idempotent and operations after close fail', () async {
      final storage = await Storage(workspace.config()).initialize();
      await storage.close();
      await storage.close();

      expect(storage.state, StorageState.closed);
      expect(storage.isReady, isFalse);
      expect(storage.health().state, StorageState.closed);

      expect(
        () => storage.settings,
        throwsA(isA<StorageNotInitializedException>()),
      );
      expect(
        () => storage.execute('SELECT 1'),
        throwsA(isA<StorageNotInitializedException>()),
      );
    });

    test('uninitialized storage rejects operations', () async {
      final storage = Storage(workspace.config());

      expect(storage.state, StorageState.uninitialized);
      expect(
        () => storage.settings,
        throwsA(isA<StorageNotInitializedException>()),
      );
      expect(
        () => storage.schemaVersion,
        throwsA(isA<StorageNotInitializedException>()),
      );
      await storage.close();
    });

    test('nested parent directories are created', () async {
      final nested =
          p.join(workspace.directory.path, 'one', 'two', 'storage.db');
      final storage =
          await Storage(workspace.config(path: nested)).initialize();

      expect(File(nested).existsSync(), isTrue);
      expect(storage.schemaVersion, coreSchemaVersion);
      await storage.close();
    });

    test('initialization failures are reported and can be retried', () async {
      final blockedParent = p.join(workspace.directory.path, 'blocked');
      File(blockedParent).writeAsStringSync('not a directory');
      final path = p.join(blockedParent, 'storage.db');
      final storage = Storage(workspace.config(path: path));

      await expectLater(
        storage.initialize(),
        throwsA(isA<StorageInitializationException>()),
      );
      expect(storage.state, StorageState.failed);
      expect(storage.health().error, isNotNull);

      File(blockedParent).deleteSync();
      await storage.initialize();
      expect(storage.state, StorageState.ready);
      await storage.close();
    });

    test('configuration validates path and timeout', () {
      expect(
        () => StorageConfig(databasePath: ''),
        throwsA(isA<StorageConfigurationException>()),
      );
      expect(
        () => StorageConfig(databasePath: '.'),
        throwsA(isA<StorageConfigurationException>()),
      );
      expect(
        () => StorageConfig(appName: ''),
        throwsA(isA<StorageConfigurationException>()),
      );
      expect(
        () => StorageConfig(busyTimeoutMs: -1),
        throwsA(isA<StorageConfigurationException>()),
      );
    });

    test('default database path uses the application directory', () {
      final path = defaultDatabasePath(appName: 'TestApp');
      expect(p.basename(path), databaseFileName);
      expect(p.dirname(path), endsWith('TestApp'));
    });
  });
}
