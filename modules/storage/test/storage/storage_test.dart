import 'package:p2p_storage/storage.dart';
import 'package:test/test.dart';

import 'helpers.dart';

StorageMigration notesMigration() {
  return sqlMigration(10, 'create_notes', [
    "CREATE TABLE notes ("
        "id INTEGER PRIMARY KEY, "
        "title TEXT NOT NULL UNIQUE, "
        "body TEXT NOT NULL DEFAULT '')",
  ]);
}

void main() {
  late TestWorkspace workspace;

  setUp(() {
    workspace = TestWorkspace();
  });

  tearDown(() {
    workspace.dispose();
  });

  group('storage facade', () {
    test('insert and retrieve records with parameters', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();

      await storage.execute(
        'INSERT INTO notes (title, body) VALUES (?, ?)',
        ["O'Brien's note", 'body text'],
      );
      final row = await storage.queryOne(
        'SELECT id, title, body FROM notes WHERE title = ?',
        ["O'Brien's note"],
      );

      expect(row?['title'], "O'Brien's note");
      expect(row?['body'], 'body text');
      expect(
        await storage.scalar('SELECT COUNT(*) AS total FROM notes'),
        1,
      );
      await storage.close();
    });

    test('update and delete stored records', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();
      await storage.execute(
        'INSERT INTO notes (title, body) VALUES (?, ?)',
        ['first', 'old'],
      );

      expect(
        await storage.update(
          'UPDATE notes SET body = ? WHERE title = ?',
          ['new', 'first'],
        ),
        1,
      );
      expect(
        await storage.queryOne(
          'SELECT body FROM notes WHERE title = ?',
          ['first'],
        ),
        {'body': 'new'},
      );

      expect(
        await storage.update('DELETE FROM notes WHERE title = ?', ['first']),
        1,
      );
      expect(await storage.queryAll('SELECT * FROM notes'), isEmpty);
      await storage.close();
    });

    test('missing data returns empty results', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();

      expect(
        await storage.queryOne('SELECT * FROM notes WHERE id = ?', [99]),
        isNull,
      );
      expect(await storage.queryAll('SELECT * FROM notes'), isEmpty);
      expect(
        await storage.scalar('SELECT body FROM notes WHERE id = ?', [99]),
        isNull,
      );
      expect(await storage.settings.has('missing.key'), isFalse);
      await storage.close();
    });

    test('invalid SQL and constraint failures are reported', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();
      await storage
          .execute('INSERT INTO notes (title) VALUES (?)', ['duplicate']);

      await expectLater(
        storage.execute('THIS IS NOT VALID SQL'),
        throwsA(isA<DatabaseOperationException>()),
      );
      await expectLater(
        storage.execute('INSERT INTO notes (title) VALUES (?)', ['duplicate']),
        throwsA(isA<DatabaseOperationException>()),
      );
      await expectLater(
        storage.queryAll('SELECT * FROM missing_table'),
        throwsA(isA<DatabaseOperationException>()),
      );
      expect(await storage.scalar('SELECT COUNT(*) AS total FROM notes'), 1);
      await storage.close();
    });

    test('transactions commit and roll back', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();

      await storage.transaction((session) async {
        await session
            .execute('INSERT INTO notes (title) VALUES (?)', ['committed']);
      });
      expect(await storage.scalar('SELECT COUNT(*) AS total FROM notes'), 1);

      await expectLater(
        storage.transaction((session) async {
          await session.execute(
            'INSERT INTO notes (title) VALUES (?)',
            ['rolled-back'],
          );
          throw StateError('simulated failure');
        }),
        throwsA(isA<DatabaseOperationException>()),
      );
      expect(
        await storage.queryAll('SELECT title FROM notes'),
        [
          {'title': 'committed'}
        ],
      );
      await storage.close();
    });

    test('failed write inside transaction rolls back', () async {
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();
      await storage.execute('INSERT INTO notes (title) VALUES (?)', ['kept']);

      await expectLater(
        storage.transaction((session) async {
          await session.execute(
            'UPDATE notes SET title = ? WHERE title = ?',
            ['changed', 'kept'],
          );
          await session.execute(
            'INSERT INTO notes (title) VALUES (?)',
            ['changed'],
          );
        }),
        throwsA(isA<DatabaseOperationException>()),
      );

      expect(
        await storage.queryAll('SELECT title FROM notes'),
        [
          {'title': 'kept'}
        ],
      );
      await storage.close();
    });

    test('operations after close are rejected', () async {
      final storage = await Storage.inMemory();
      await storage.close();

      expect(
        () => storage.execute('SELECT 1'),
        throwsA(isA<StorageNotInitializedException>()),
      );
      expect(
        () => storage.transaction((session) async {}),
        throwsA(isA<StorageNotInitializedException>()),
      );
      expect(
        () => storage.update('DELETE FROM settings'),
        throwsA(isA<StorageNotInitializedException>()),
      );
    });

    test('facade does not expose a raw database connection', () async {
      final storage = await Storage.inMemory();

      expect(storage.settings, isA<SettingsStore>());
      expect(storage.schemaVersion, coreSchemaVersion);
      expect(storage.databasePath, ':memory:');
      await storage.close();
    });

    test('each test uses an isolated temporary database', () async {
      expect(workspace.directory.existsSync(), isTrue);
      final storage = await Storage(
        workspace.config(migrations: [notesMigration()]),
      ).initialize();
      await storage.settings.set('test.only', 'value');

      expect(await storage.settings.get<String>('test.only'), 'value');
      await storage.close();
    });
  });
}
