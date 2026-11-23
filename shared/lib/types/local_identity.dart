import 'display_name.dart';
import 'peer_id.dart';

class LocalIdentity {
  const LocalIdentity({required this.id, required this.displayName});

  final PeerId id;
  final DisplayName displayName;

  LocalIdentity withDisplayName(DisplayName name) {
    return LocalIdentity(id: id, displayName: name);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocalIdentity &&
          other.id == id &&
          other.displayName == displayName;

  @override
  int get hashCode => Object.hash(id, displayName);

  @override
  String toString() => 'LocalIdentity(id: $id, displayName: $displayName)';
}
