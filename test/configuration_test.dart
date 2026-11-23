import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/foundation/foundation.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

ConfigurationManager buildManager({
  required SettingsStorage storage,
  required EventBus eventBus,
}) {
  return ConfigurationManager(storage: storage, eventBus: eventBus);
}

void main() {
  test('loads defaults and persists them on first load', () async {
    final storage = MockSettingsStorage();
    final bus = FoundationEventBus(errorReporter: RecordingErrorReporter());
    final events = <ConfigurationChanged>[];
    bus.subscribe<ConfigurationChanged>(events.add);
    final manager = buildManager(storage: storage, eventBus: bus);

    final config = await manager.load();

    expect(config, ApplicationConfig.defaults());
    expect(storage.writeCount, 1);
    expect(storage.storedConfig, config);
    expect(events.single.config, config);
  });

  test('reloads stored configuration without rewriting it', () async {
    final config = ApplicationConfig(
      moduleInitializationTimeout: const Duration(seconds: 9),
      initializeModulesOnStartup: false,
    );
    final storage = MockSettingsStorage(config: config);
    final manager = buildManager(
      storage: storage,
      eventBus: FoundationEventBus(errorReporter: RecordingErrorReporter()),
    );

    final loaded = await manager.load();

    expect(loaded, config);
    expect(storage.readCount, 1);
    expect(storage.writeCount, 0);
  });

  test('updates configuration and publishes the change', () async {
    final storage = MockSettingsStorage();
    final bus = FoundationEventBus(errorReporter: RecordingErrorReporter());
    final manager = buildManager(storage: storage, eventBus: bus);
    await manager.load();
    final updated = ApplicationConfig(
      moduleInitializationTimeout: const Duration(seconds: 12),
    );

    final result = await manager.update(updated);

    expect(result, updated);
    expect(manager.current, updated);
    expect(storage.storedConfig, updated);
  });

  test('wraps storage failures as configuration errors', () async {
    final storage = MockSettingsStorage(
      readError: StateError('unavailable'),
    );
    final manager = buildManager(
      storage: storage,
      eventBus: FoundationEventBus(errorReporter: RecordingErrorReporter()),
    );

    await expectLater(
      manager.load(),
      throwsA(
        isA<FoundationError>().having(
          (error) => error.category,
          'category',
          FoundationErrorCategory.configuration,
        ),
      ),
    );
  });
}
