import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'support/test_peer_services.dart';

void main() {
  test('PeerDirectory implementations return shared snapshots', () async {
    final descriptor = PeerDescriptor(
      id: PeerId('peer-1'),
      displayName: DisplayName('Ada'),
    );
    final PeerDirectory directory = TestPeerDirectory(
      PeerSnapshot(<PeerDescriptor>[descriptor]),
    );

    final snapshot = await directory.knownPeers();

    expect(snapshot.peers, <PeerDescriptor>[descriptor]);
  });

  test('PeerPayloadSender implementations accept shared requests', () async {
    final recorder = TestPeerPayloadSender();
    final PeerPayloadSender sender = recorder;
    final request = PeerSendRequest(
      recipient: PeerId('peer-2'),
      payload: TransportPayload('hello'),
    );

    await sender.send(request);

    expect(recorder.sentRequests, <PeerSendRequest>[request]);
  });
}
