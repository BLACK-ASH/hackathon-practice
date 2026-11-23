import 'display_name.dart';
import 'peer_id.dart';

class PeerDescriptor {
  const PeerDescriptor({required this.id, required this.displayName});

  final PeerId id;
  final DisplayName displayName;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PeerDescriptor &&
          other.id == id &&
          other.displayName == displayName;

  @override
  int get hashCode => Object.hash(id, displayName);

  @override
  String toString() => 'PeerDescriptor(id: $id, displayName: $displayName)';
}
