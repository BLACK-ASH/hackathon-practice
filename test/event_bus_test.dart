import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/foundation/foundation.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

void main() {
  FoundationEventBus buildBus(RecordingErrorReporter reporter) {
    return FoundationEventBus(errorReporter: reporter);
  }

  test('delivers typed events only to matching subscribers', () {
    final reporter = RecordingErrorReporter();
    final bus = buildBus(reporter);
    final configs = <ConfigurationChanged>[];
    final identities = <IdentityChanged>[];
    bus.subscribe<ConfigurationChanged>(configs.add);
    bus.subscribe<IdentityChanged>(identities.add);

    bus.publish(
      ConfigurationChanged(
        source: 'test',
        config: ApplicationConfig.defaults(),
      ),
    );

    expect(configs.length, 1);
    expect(identities, isEmpty);
  });

  test('cancellation stops further delivery', () {
    final bus = buildBus(RecordingErrorReporter());
    final received = <ConfigurationChanged>[];
    final subscription = bus.subscribe<ConfigurationChanged>(received.add);

    bus.publish(
      ConfigurationChanged(source: 'test', config: ApplicationConfig.defaults()),
    );
    subscription.cancel();
    bus.publish(
      ConfigurationChanged(source: 'test', config: ApplicationConfig.defaults()),
    );

    expect(received.length, 1);
    expect(subscription.isActive, isFalse);
  });

  test('a failing handler is reported and does not block other handlers', () {
    final reporter = RecordingErrorReporter();
    final bus = buildBus(reporter);
    var delivered = 0;
    bus.subscribe<ConfigurationChanged>(
      (_) => throw StateError('bad listener'),
    );
    bus.subscribe<ConfigurationChanged>((_) => delivered++);

    bus.publish(
      ConfigurationChanged(source: 'test', config: ApplicationConfig.defaults()),
    );

    expect(delivered, 1);
    expect(reporter.errors.length, 1);
    expect(
      reporter.errors.single.category,
      FoundationErrorCategory.communication,
    );
  });
}
