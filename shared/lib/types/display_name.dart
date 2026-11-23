class DisplayName {
  factory DisplayName(String raw) {
    final value = raw.trim();
    if (value.isEmpty) {
      throw ArgumentError.value(raw, 'displayName', 'must not be empty');
    }
    return DisplayName._(value);
  }

  const DisplayName._(this.value);

  final String value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DisplayName && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'DisplayName($value)';
}
