import '../types/peer_descriptor.dart';

class PeerSnapshot {
  PeerSnapshot(Iterable<PeerDescriptor> peers)
      : peers = List<PeerDescriptor>.unmodifiable(peers);

  final List<PeerDescriptor> peers;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PeerSnapshot && _samePeers(other.peers, peers);

  @override
  int get hashCode => Object.hashAll(peers);

  @override
  String toString() => 'PeerSnapshot(peers: $peers)';

  static bool _samePeers(
    List<PeerDescriptor> left,
    List<PeerDescriptor> right,
  ) {
    if (left.length != right.length) {
      return false;
    }
    for (var index = 0; index < left.length; index++) {
      if (left[index] != right[index]) {
        return false;
      }
    }
    return true;
  }
}
