class TransportPayload {
  factory TransportPayload(String raw) {
    if (raw.trim().isEmpty) {
      throw ArgumentError.value(raw, 'payload', 'must not be empty');
    }
    return TransportPayload._(raw);
  }

  const TransportPayload._(this.value);

  final String value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TransportPayload && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'TransportPayload($value)';
}
