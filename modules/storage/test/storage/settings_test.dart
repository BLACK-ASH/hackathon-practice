import 'package:p2p_storage/storage.dart';
import 'package:test/test.dart';

import 'helpers.dart';

void main() {
  group('settings persistence', () {
    test('save and retrieve an untyped setting', () async {
      final storage = await Storage.inMemory();

      await storage.settings.set('custom.name', 'Farhan');
      expect(await storage.settings.get<String>('custom.name'), 'Farhan');
      expect(await storage.settings.has('custom.name'), isTrue);
      expect(await storage.settings.count(), 1);
      await storage.close();
    });

    test('retrieve defaults, fallbacks, and missing settings', () async {
      final storage = await Storage.inMemory(
        config: StorageConfig(settingDefinitions: appDefinitions()),
      );

      expect(await storage.settings.get<String>('app.theme'), 'system');
      expect(await storage.settings.has('app.theme'), isFalse);
      expect(
        await storage.settings.getOrDefault<String>('missing.key', 'fallback'),
        'fallback',
      );
      expect(
        () => storage.settings.get<String>('missing.key'),
        throwsA(isA<SettingNotFoundException>()),
      );
      await storage.close();
    });

    test('update existing settings and reject missing updates', () async {
      final storage = await Storage.inMemory();

      await storage.settings.set('custom.value', 1);
      await storage.settings.update('custom.value', 2);
      expect(await storage.settings.get<int>('custom.value'), 2);
      expect(
        () => storage.settings.update('missing.key', 3),
        throwsA(isA<SettingNotFoundException>()),
      );
      await storage.close();
    });

    test('get all returns every stored setting', () async {
      final storage = await Storage.inMemory();

      expect(await storage.settings.getAll(), isEmpty);
      await storage.settings.set('b.key', false);
      await storage.settings.set('a.key', {'x': 1});
      expect(await storage.settings.getAll(), {
        'a.key': {'x': 1},
        'b.key': false,
      });
      await storage.close();
    });

    test('delete and reset single settings', () async {
      final storage = await Storage.inMemory(
        config: StorageConfig(
          settingDefinitions: [
            stringSetting('app.theme', defaultValue: 'system'),
            integerSetting('app.font_size', defaultValue: 14),
          ],
        ),
      );

      await storage.settings.set('app.theme', 'dark');
      await storage.settings.set('app.font_size', 20);
      await storage.settings.set('custom.key', 'value');

      expect(await storage.settings.delete('custom.key'), isTrue);
      expect(await storage.settings.delete('custom.key'), isFalse);
      await storage.settings.set('custom.key', 'value');
      await storage.settings.reset('custom.key');
      expect(await storage.settings.has('custom.key'), isFalse);

      await storage.settings.reset('app.theme');
      expect(await storage.settings.get<String>('app.theme'), 'system');
      expect(await storage.settings.has('app.theme'), isTrue);

      await storage.settings.reset('app.font_size');
      expect(await storage.settings.get<int>('app.font_size'), 14);
      expect(await storage.settings.getAll(), {
        'app.font_size': 14,
        'app.theme': 'system',
      });
      await storage.close();
    });

    test('reset all deletes stored rows and keeps defaults available',
        () async {
      final storage = await Storage.inMemory(
        config: StorageConfig(settingDefinitions: appDefinitions()),
      );

      await storage.settings.set('app.theme', 'dark');
      await storage.settings.set('app.font_size', 18);
      await storage.settings.set('app.notifications', false);
      await storage.settings.set(
        'app.window',
        {'width': 800, 'height': 600},
      );

      expect(await storage.settings.resetAll(), 4);
      expect(await storage.settings.count(), 0);
      expect(await storage.settings.getAll(), isEmpty);
      expect(await storage.settings.get<String>('app.theme'), 'system');
      expect(await storage.settings.get<int>('app.font_size'), 14);
      expect(await storage.settings.get<bool>('app.notifications'), isTrue);
      expect(
        await storage.settings.get<Map<String, Object?>>('app.window'),
        {'width': 1024, 'height': 768},
      );
      await storage.close();
    });

    test('invalid values are rejected before storage', () async {
      final storage = await Storage.inMemory(
        config: StorageConfig(
          settingDefinitions: [
            stringSetting(
              'app.theme',
              defaultValue: 'system',
              allowed: {'light', 'dark', 'system'},
            ),
            integerSetting('app.font_size',
                defaultValue: 14, minimum: 10, maximum: 32),
            booleanSetting('app.notifications', defaultValue: true),
          ],
        ),
      );

      expect(
        () => storage.settings.set('app.theme', 'purple'),
        throwsA(isA<InvalidSettingException>()),
      );
      expect(
        () => storage.settings.set('app.font_size', 9),
        throwsA(isA<InvalidSettingException>()),
      );
      expect(
        () => storage.settings.set('app.notifications', 'yes'),
        throwsA(isA<InvalidSettingException>()),
      );
      expect(
        () => storage.settings.set('custom.unserializable', Object()),
        throwsA(isA<InvalidSettingException>()),
      );
      expect(await storage.settings.count(), 0);
      await storage.close();
    });

    test('invalid keys and definitions are rejected', () async {
      final storage = await Storage.inMemory();

      for (final key in ['', 'bad key', '.leading', 'x' * 129]) {
        expect(
          () => storage.settings.get<Object?>(key),
          throwsA(isA<InvalidSettingException>()),
        );
      }
      expect(
        () => stringSetting('app.theme',
            defaultValue: 'purple', allowed: {'light'}),
        throwsA(isA<StorageConfigurationException>()),
      );
      expect(
        () => integerSetting('app.font_size', defaultValue: 9, minimum: 10),
        throwsA(isA<StorageConfigurationException>()),
      );
      await storage.close();
    });

    test('corrupt JSON is reported and recoverable', () async {
      final storage = await Storage.inMemory();
      await storage.settings.set('custom.key', 'valid');
      await storage.execute(
        'UPDATE settings SET value = ? WHERE key = ?',
        ['not-json', 'custom.key'],
      );

      expect(
        () => storage.settings.get<String>('custom.key'),
        throwsA(isA<CorruptedSettingException>()),
      );
      expect(
        () => storage.settings.getAll(),
        throwsA(isA<CorruptedSettingException>()),
      );

      await storage.settings.set('custom.key', 'restored');
      expect(await storage.settings.get<String>('custom.key'), 'restored');
      await storage.close();
    });

    test('invalid stored value is reported', () async {
      final storage = await Storage.inMemory(
        config: StorageConfig(
          settingDefinitions: [
            stringSetting(
              'app.theme',
              defaultValue: 'light',
              allowed: {'light', 'dark', 'system'},
            ),
          ],
        ),
      );
      await storage.settings.set('app.theme', 'light');
      await storage.execute(
        'UPDATE settings SET value = ? WHERE key = ?',
        ['"purple"', 'app.theme'],
      );

      expect(
        () => storage.settings.get<String>('app.theme'),
        throwsA(isA<CorruptedSettingException>()),
      );
      await storage.settings.set('app.theme', 'dark');
      expect(await storage.settings.get<String>('app.theme'), 'dark');
      await storage.close();
    });

    test('values survive close and reopen', () async {
      final workspace = TestWorkspace();
      addTearDown(workspace.dispose);
      final config = workspace.config(definitions: appDefinitions());
      final first = await Storage(config).initialize();

      await first.settings.set('app.theme', 'dark');
      await first.settings.set('app.window', {'width': 640, 'height': 480});
      await first.close();

      final second = await Storage(config).initialize();
      expect(await second.settings.get<String>('app.theme'), 'dark');
      expect(
        await second.settings.get<Map<String, Object?>>('app.window'),
        {'width': 640, 'height': 480},
      );
      expect((await second.settings.getAll()).length, 2);
      await second.close();
    });

    test('mutable defaults cannot be changed by callers', () async {
      final defaultWindow = {'width': 1024, 'height': 768};
      final storage = await Storage.inMemory(
        config: StorageConfig(
          settingDefinitions: [
            jsonSetting('app.window', defaultValue: defaultWindow)
          ],
        ),
      );

      final value =
          await storage.settings.get<Map<String, Object?>>('app.window');
      value['width'] = 1;
      defaultWindow['height'] = 1;

      expect(
        await storage.settings.get<Map<String, Object?>>('app.window'),
        {'width': 1024, 'height': 768},
      );
      await storage.close();
    });

    test('unknown settings accept any JSON value', () async {
      final storage = await Storage.inMemory();

      await storage.settings.set('custom.list', [1, 'two', null, false]);
      expect(
        await storage.settings.get<List<Object?>>('custom.list'),
        [1, 'two', null, false],
      );
      await storage.close();
    });
  });
}
