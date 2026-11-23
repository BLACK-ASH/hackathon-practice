import 'peer_snapshot.dart';

abstract class PeerDirectory {
  Future<PeerSnapshot> knownPeers();
}
