import 'package:drift/drift.dart';

part 'database.g.dart';

@DataClassName('SettingRow')
class SettingsTable extends Table {
  @override
  String get tableName => 'settings';

  TextColumn get key => text().withLength(min: 1, max: 128)();

  TextColumn get value => text()();

  TextColumn get updatedAt => text()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

@DriftDatabase(tables: [SettingsTable])
class StorageDatabase extends _$StorageDatabase {
  StorageDatabase(super.executor);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator migrator) async {
          await migrator.createTable(settingsTable);
        },
        beforeOpen: (OpeningDetails details) async {
          await customStatement('PRAGMA foreign_keys = ON');
        },
      );
}
