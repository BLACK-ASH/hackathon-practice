import 'dart:io';

import 'package:p2p_storage/storage.dart';
import 'package:path/path.dart' as p;

Future<void> main() async {
  final directory = Directory.systemTemp.createTempSync('p2p-storage-demo-');
  final databasePath = p.join(directory.path, 'storage.db');
  final config = StorageConfig(
    databasePath: databasePath,
    settingDefinitions: [
      stringSetting(
        'demo.display_name',
        defaultValue: 'Guest',
        maxLength: 40,
        description: 'Name shown to nearby peers.',
      ),
      booleanSetting(
        'demo.notifications',
        defaultValue: true,
        description: 'Whether desktop notifications are enabled.',
      ),
    ],
  );

  Storage? active;
  try {
    print('1. initialize: $databasePath');
    final first = await Storage(config).initialize();
    active = first;
    print('   schema version: ${first.schemaVersion}');
    print('   state: ${first.state.name}');

    print('2. save demo.display_name = Farhan');
    await first.settings.set('demo.display_name', 'Farhan');
    await first.settings.set('demo.notifications', false);

    print(
      '3. retrieve demo.display_name = '
      '${await first.settings.get<String>('demo.display_name')}',
    );
    print('   stored settings: ${await first.settings.getAll()}');

    print('4. update demo.display_name = Farhan (Updated)');
    await first.settings.update('demo.display_name', 'Farhan (Updated)');
    print(
      '   updated value = '
      '${await first.settings.get<String>('demo.display_name')}',
    );

    print('5. close storage');
    await first.close();
    active = null;
    print('   state: ${first.state.name}');

    print('6. reopen the same database file');
    final second = await Storage(config).initialize();
    active = second;
    print('   schema version: ${second.schemaVersion}');
    print('   migrations: ${(await second.appliedMigrations()).length}');

    final persisted = await second.settings.get<String>('demo.display_name');
    print('7. value survived restart = $persisted');
    if (persisted != 'Farhan (Updated)') {
      throw StateError('stored setting was not preserved across restart');
    }

    print('8. reset demo.display_name back to its default');
    await second.settings.reset('demo.display_name');
    final resetValue = await second.settings.get<String>('demo.display_name');
    print('   reset value = $resetValue');
    if (resetValue != 'Guest') {
      throw StateError('setting was not reset to its default');
    }

    print(
      '   resetAll removes stored rows: ${await second.settings.resetAll()}',
    );
    print('   stored rows after resetAll: ${await second.settings.count()}');
    if (await second.settings.count() != 0) {
      throw StateError('resetAll did not clear stored settings');
    }

    print('9. stored settings after reset: ${await second.settings.getAll()}');
    print(
      '   demo.notifications default = '
      '${await second.settings.get<bool>('demo.notifications')}',
    );

    await second.close();
    active = null;
    print('10. closed: ${second.state.name}');
    print('DEMO PASSED');
  } finally {
    try {
      await active?.close();
    } finally {
      if (directory.existsSync()) {
        directory.deleteSync(recursive: true);
      }
    }
  }
}
