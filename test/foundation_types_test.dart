import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';

void main() {
  group('LocalIdentity', () {
    test('supports display-name replacement without changing peer ID', () {
      final identity = LocalIdentity(
        id: PeerId('peer-1'),
        displayName: DisplayName('Ada'),
      );

      final updated = identity.withDisplayName(DisplayName('Grace'));

      expect(updated.id, identity.id);
      expect(updated.displayName.value, 'Grace');
      expect(identity.displayName.value, 'Ada');
      expect(updated, isNot(identity));
    });

    test('uses value equality', () {
      final first = LocalIdentity(
        id: PeerId('peer-1'),
        displayName: DisplayName('Ada'),
      );
      final second = LocalIdentity(
        id: PeerId('peer-1'),
        displayName: DisplayName('Ada'),
      );

      expect(first, second);
      expect(first.hashCode, second.hashCode);
    });
  });

  group('ApplicationConfig', () {
    test('provides sensible defaults', () {
      final config = ApplicationConfig.defaults();

      expect(config.moduleInitializationTimeout, const Duration(seconds: 5));
      expect(config.initializeModulesOnStartup, isTrue);
    });

    test('rejects a non-positive initialization timeout', () {
      expect(
        () => ApplicationConfig(
          moduleInitializationTimeout: Duration.zero,
        ),
        throwsArgumentError,
      );
    });

    test('copyWith updates only the requested field', () {
      final config = ApplicationConfig.defaults();

      final updated = config.copyWith(initializeModulesOnStartup: false);

      expect(updated.moduleInitializationTimeout,
          config.moduleInitializationTimeout);
      expect(updated.initializeModulesOnStartup, isFalse);
      expect(config.initializeModulesOnStartup, isTrue);
    });
  });

  group('ModuleHealth', () {
    test('trims module names and reports readiness', () {
      final ready = ModuleHealth(
        moduleName: ' identity ',
        status: ModuleStatus.ready,
      );
      final failed = ModuleHealth(
        moduleName: 'network',
        status: ModuleStatus.failed,
      );

      expect(ready.moduleName, 'identity');
      expect(ready.status, ModuleStatus.ready);
      expect(ready.isHealthy, isTrue);
      expect(failed.isHealthy, isFalse);
    });

    test('rejects blank module names', () {
      expect(
        () => ModuleHealth(moduleName: '  ', status: ModuleStatus.ready),
        throwsArgumentError,
      );
    });
  });
}
