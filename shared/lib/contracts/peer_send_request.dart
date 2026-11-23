import '../types/peer_id.dart';
import '../types/transport_payload.dart';

class PeerSendRequest {
  const PeerSendRequest({required this.recipient, required this.payload});

  final PeerId recipient;
  final TransportPayload payload;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PeerSendRequest &&
          other.recipient == recipient &&
          other.payload == payload;

  @override
  int get hashCode => Object.hash(recipient, payload);

  @override
  String toString() =>
      'PeerSendRequest(recipient: $recipient, payload: $payload)';
}
