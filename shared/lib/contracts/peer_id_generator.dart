import '../types/peer_id.dart';

abstract class PeerIdGenerator {
  PeerId next();
}
