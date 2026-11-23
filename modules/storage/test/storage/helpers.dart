import 'dart:io';

import 'package:p2p_storage/storage.dart';
import 'package:path/path.dart' as p;

class TestWorkspace {
  TestWorkspace()
      : directory = Directory.systemTemp.createTempSync('p2p-storage-');

  final Directory directory;

  String get databasePath => p.join(directory.path, 'storage.db');

  StorageConfig config({
    String? path,
    Iterable<StorageMigration> migrations = const [],
    Iterable<SettingDefinition<Object?>> definitions = const [],
    bool enableWal = true,
  }) {
    return StorageConfig(
      databasePath: path ?? databasePath,
      additionalMigrations: migrations,
      settingDefinitions: definitions,
      enableWal: enableWal,
    );
  }

  void dispose() {
    if (directory.existsSync()) {
      directory.deleteSync(recursive: true);
    }
  }
}

List<SettingDefinition<Object?>> appDefinitions() {
  return <SettingDefinition<Object?>>[
    stringSetting(
      'app.theme',
      defaultValue: 'system',
      allowed: {'light', 'dark', 'system'},
    ),
    integerSetting('app.font_size', defaultValue: 14, minimum: 10, maximum: 32),
    booleanSetting('app.notifications', defaultValue: true),
    jsonSetting(
      'app.window',
      defaultValue: const {'width': 1024, 'height': 768},
    ),
  ];
}
