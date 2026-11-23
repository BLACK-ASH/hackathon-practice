import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger/src/foundation/foundation.dart';
import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

void main() {
  test('development composition initializes the foundation modules', () async {
    final components = FoundationComponents.forDevelopment();
    final statuses = <ModuleStatusChanged>[];
    components.eventBus.subscribe<ModuleStatusChanged>(statuses.add);

    final report = await components.initialize();

    expect(report.allReady, isTrue);
    expect(
      report.modules.map((health) => health.moduleName).toList(),
      <String>['identity', 'configuration'],
    );
    expect(components.identityManager.current, isNotNull);
    expect(components.configurationManager.current, isNotNull);
    expect(
      statuses.map((event) => event.health.moduleName).toList(),
      <String>['identity', 'configuration'],
    );
    expect((components.errorReporter as RecordingErrorReporter).errors, isEmpty);
  });

  test('shell can read the initialized local identity', () async {
    final components = FoundationComponents.forDevelopment();
    await components.initialize();

    final identity = components.identityManager.current;

    expect(identity, isNotNull);
    expect(identity!.displayName.value, 'Local User');
    expect(identity.id.value, 'local-device');
  });
}
