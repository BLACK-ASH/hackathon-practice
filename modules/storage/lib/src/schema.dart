import 'migrations.dart';

const settingsTable = 'settings';

final coreMigrations = <StorageMigration>[
  sqlMigration(
    1,
    'create_settings_table',
    [
      '''
CREATE TABLE IF NOT EXISTS $settingsTable (
  key TEXT NOT NULL PRIMARY KEY CHECK (length(key) > 0 AND length(key) <= 128),
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
''',
    ],
  ),
];

int get coreSchemaVersion => coreMigrations.last.version;
