import 'peer_send_request.dart';

abstract class PeerPayloadSender {
  Future<void> send(PeerSendRequest request);
}
