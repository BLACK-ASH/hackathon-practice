import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/foundation/foundation.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

IdentityManager buildManager({
  required IdentityStorage storage,
  required PeerIdGenerator generator,
  required EventBus eventBus,
}) {
  return IdentityManager(
    storage: storage,
    idGenerator: generator,
    eventBus: eventBus,
  );
}

void main() {
  test('creates a default identity and persists it', () async {
    final storage = MockIdentityStorage();
    final bus = FoundationEventBus(errorReporter: RecordingErrorReporter());
    final events = <IdentityChanged>[];
    bus.subscribe<IdentityChanged>(events.add);
    final manager = buildManager(
      storage: storage,
      generator: MockPeerIdGenerator(<PeerId>[PeerId('peer-a')]),
      eventBus: bus,
    );

    final identity = await manager.loadOrCreate();

    expect(identity.id.value, 'peer-a');
    expect(identity.displayName.value, 'Local User');
    expect(storage.writeCount, 1);
    expect(storage.storedIdentity, identity);
    expect(events.length, 1);
    expect(events.single.identity, identity);
  });

  test('reloads a stored identity without generating a new one', () async {
    final stored = LocalIdentity(
      id: PeerId('stored'),
      displayName: DisplayName('Stored User'),
    );
    final storage = MockIdentityStorage(identity: stored);
    final bus = FoundationEventBus(errorReporter: RecordingErrorReporter());
    final generator = MockPeerIdGenerator(<PeerId>[PeerId('new-peer')]);

    final first = await buildManager(
      storage: storage,
      generator: generator,
      eventBus: bus,
    ).loadOrCreate();
    final second = await buildManager(
      storage: storage,
      generator: generator,
      eventBus: bus,
    ).loadOrCreate();

    expect(first, stored);
    expect(second, stored);
    expect(storage.writeCount, 0);
  });

  test('updates the display name and persists the change', () async {
    final storage = MockIdentityStorage();
    final bus = FoundationEventBus(errorReporter: RecordingErrorReporter());
    final events = <IdentityChanged>[];
    bus.subscribe<IdentityChanged>(events.add);
    final manager = buildManager(
      storage: storage,
      generator: MockPeerIdGenerator(<PeerId>[PeerId('peer-a')]),
      eventBus: bus,
    );
    await manager.loadOrCreate();

    final updated = await manager.updateDisplayName(DisplayName('Grace'));

    expect(updated.displayName.value, 'Grace');
    expect(manager.current, updated);
    expect(storage.storedIdentity, updated);
    expect(events.length, 2);
  });

  test('wraps storage failures as storage errors', () async {
    final storage = MockIdentityStorage(readError: StateError('unavailable'));
    final manager = buildManager(
      storage: storage,
      generator: MockPeerIdGenerator(),
      eventBus: FoundationEventBus(errorReporter: RecordingErrorReporter()),
    );

    await expectLater(
      manager.loadOrCreate(),
      throwsA(
        isA<FoundationError>().having(
          (error) => error.category,
          'category',
          FoundationErrorCategory.storage,
        ),
      ),
    );
  });

  test('rejects an update before identity is loaded', () async {
    final manager = buildManager(
      storage: MockIdentityStorage(),
      generator: MockPeerIdGenerator(),
      eventBus: FoundationEventBus(errorReporter: RecordingErrorReporter()),
    );

    await expectLater(
      manager.updateDisplayName(DisplayName('Grace')),
      throwsA(
        isA<FoundationError>().having(
          (error) => error.category,
          'category',
          FoundationErrorCategory.validation,
        ),
      ),
    );
  });
}
