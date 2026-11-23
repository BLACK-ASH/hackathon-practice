import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';

void main() {
  group('PeerSnapshot', () {
    test('exposes an unmodifiable peer list', () {
      final descriptor = PeerDescriptor(
        id: PeerId('peer-1'),
        displayName: DisplayName('Ada'),
      );
      final snapshot = PeerSnapshot(<PeerDescriptor>[descriptor]);

      expect(snapshot.peers, <PeerDescriptor>[descriptor]);
      expect(
        () => snapshot.peers.add(descriptor),
        throwsUnsupportedError,
      );
    });

    test('uses value equality', () {
      final descriptor = PeerDescriptor(
        id: PeerId('peer-1'),
        displayName: DisplayName('Ada'),
      );

      expect(
        PeerSnapshot(<PeerDescriptor>[descriptor]),
        PeerSnapshot(<PeerDescriptor>[descriptor]),
      );
      expect(
        PeerSnapshot(<PeerDescriptor>[descriptor]).hashCode,
        PeerSnapshot(<PeerDescriptor>[descriptor]).hashCode,
      );
    });
  });

  group('PeerSendRequest', () {
    test('carries typed recipient and payload', () {
      final request = PeerSendRequest(
        recipient: PeerId('peer-2'),
        payload: TransportPayload('hello'),
      );

      expect(request.recipient.value, 'peer-2');
      expect(request.payload.value, 'hello');
      expect(
        request,
        PeerSendRequest(
          recipient: PeerId('peer-2'),
          payload: TransportPayload('hello'),
        ),
      );
    });
  });
}
