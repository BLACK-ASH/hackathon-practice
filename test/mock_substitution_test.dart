import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

void main() {
  test('peer directory and payload sender mocks work behind interfaces',
      () async {
    final descriptor = PeerDescriptor(
      id: PeerId('peer-1'),
      displayName: DisplayName('Ada'),
    );
    final PeerDirectory directory = MockPeerDirectory(
      PeerSnapshot(<PeerDescriptor>[descriptor]),
    );
    final recorder = MockPeerPayloadSender();
    final PeerPayloadSender sender = recorder;
    final request = PeerSendRequest(
      recipient: PeerId('peer-2'),
      payload: TransportPayload('hello'),
    );

    final snapshot = await directory.knownPeers();
    await sender.send(request);

    expect(snapshot.peers.single, descriptor);
    expect(recorder.sentRequests.single, request);
  });

  test('peer ID generator mock is deterministic behind its interface', () {
    final PeerIdGenerator generator = MockPeerIdGenerator(<PeerId>[
      PeerId('first'),
      PeerId('second'),
    ]);

    expect(generator.next().value, 'first');
    expect(generator.next().value, 'second');
    expect(generator.next().value, 'generated-peer-1');
  });

  test('error reporter mock works behind its interface', () {
    final reporter = RecordingErrorReporter();
    final ErrorReporter contract = reporter;
    final error = FoundationError.validation('Invalid value.');

    contract.report(error);

    expect(reporter.errors.single, error);
  });
}
