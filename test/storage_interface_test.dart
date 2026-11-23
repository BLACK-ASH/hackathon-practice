import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

void main() {
  test('IdentityStorage implementations round-trip typed identity data',
      () async {
    final identity = LocalIdentity(
      id: PeerId('peer-1'),
      displayName: DisplayName('Ada'),
    );
    final MockIdentityStorage storage = MockIdentityStorage();

    await storage.writeIdentity(identity);
    final IdentityStorage contract = storage;
    final loaded = await contract.readIdentity();

    expect(loaded, identity);
    expect(storage.readCount, 1);
    expect(storage.writeCount, 1);
  });

  test('SettingsStorage implementations round-trip typed configuration',
      () async {
    final config = ApplicationConfig(
      moduleInitializationTimeout: const Duration(seconds: 11),
      initializeModulesOnStartup: false,
    );
    final MockSettingsStorage storage = MockSettingsStorage();

    await storage.writeSettings(config);
    final SettingsStorage contract = storage;
    final loaded = await contract.readSettings();

    expect(loaded, config);
    expect(storage.readCount, 1);
    expect(storage.writeCount, 1);
  });
}
