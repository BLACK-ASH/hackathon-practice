import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/foundation/foundation.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

void main() {
  ModuleRegistry buildRegistry({
    required EventBus eventBus,
    required ErrorReporter errorReporter,
  }) {
    return ModuleRegistry(eventBus: eventBus, errorReporter: errorReporter);
  }

  test('registers and initializes modules in registration order', () async {
    final bus = FoundationEventBus(errorReporter: RecordingErrorReporter());
    final statuses = <ModuleStatusChanged>[];
    bus.subscribe<ModuleStatusChanged>(statuses.add);
    final registry = buildRegistry(
      eventBus: bus,
      errorReporter: RecordingErrorReporter(),
    );
    registry.register(StubFoundationModule(name: 'identity'));
    registry.register(StubFoundationModule(name: 'configuration'));

    final report = await registry.initializeAll();

    expect(report.allReady, isTrue);
    expect(
      report.modules.map((health) => health.moduleName).toList(),
      <String>['identity', 'configuration'],
    );
    expect(
      statuses.map((event) => event.health.moduleName).toList(),
      <String>['identity', 'configuration'],
    );
  });

  test('isolates one module failure from other modules', () async {
    final reporter = RecordingErrorReporter();
    final registry = buildRegistry(
      eventBus: FoundationEventBus(errorReporter: reporter),
      errorReporter: reporter,
    );
    registry.register(
      StubFoundationModule(
        name: 'broken',
        onInitialize: () async => throw StateError('boom'),
      ),
    );
    registry.register(StubFoundationModule(name: 'healthy'));

    final report = await registry.initializeAll();

    expect(report.allReady, isFalse);
    expect(report.failed.map((health) => health.moduleName).toList(),
        <String>['broken']);
    expect(
      report.modules.lastWhere((health) => health.moduleName == 'healthy')
          .status,
      ModuleStatus.ready,
    );
    expect(reporter.errors.length, 1);
    expect(reporter.errors.single.category, FoundationErrorCategory.module);
  });

  test('reports initialization timeouts', () async {
    final reporter = RecordingErrorReporter();
    final registry = buildRegistry(
      eventBus: FoundationEventBus(errorReporter: reporter),
      errorReporter: reporter,
    );
    final pending = Completer<ModuleHealth>();
    registry.register(
      StubFoundationModule(name: 'slow', onInitialize: () => pending.future),
    );

    final report = await registry.initializeAll(
      timeout: const Duration(milliseconds: 5),
    );

    expect(report.failed.single.moduleName, 'slow');
    expect(report.failed.single.detail, 'Initialization timed out.');
    expect(reporter.errors.single.category, FoundationErrorCategory.module);
  });

  test('rejects duplicate and blank module names', () {
    final registry = buildRegistry(
      eventBus: FoundationEventBus(errorReporter: RecordingErrorReporter()),
      errorReporter: RecordingErrorReporter(),
    );
    registry.register(StubFoundationModule(name: 'identity'));

    expect(
      () => registry.register(StubFoundationModule(name: ' identity ')),
      throwsA(isA<FoundationError>()),
    );
    expect(
      () => registry.register(StubFoundationModule(name: ' ')),
      throwsA(isA<FoundationError>()),
    );
  });

  test('dispose marks registered modules as disposed', () async {
    final registry = buildRegistry(
      eventBus: FoundationEventBus(errorReporter: RecordingErrorReporter()),
      errorReporter: RecordingErrorReporter(),
    );
    final module = StubFoundationModule(name: 'identity');
    registry.register(module);
    await registry.initializeAll();

    await registry.disposeAll();

    expect(module.health.status, ModuleStatus.disposed);
    expect(registry.health.single.status, ModuleStatus.disposed);
  });
}
