class PeerId {
  factory PeerId(String raw) {
    final value = raw.trim();
    if (value.isEmpty) {
      throw ArgumentError.value(raw, 'peerId', 'must not be empty');
    }
    return PeerId._(value);
  }

  const PeerId._(this.value);

  final String value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is PeerId && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'PeerId($value)';
}
