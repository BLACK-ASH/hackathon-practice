enum FoundationErrorCategory {
  validation,
  configuration,
  storage,
  module,
  communication,
}

class FoundationError implements Exception {
  factory FoundationError({
    required FoundationErrorCategory category,
    required String message,
    Object? cause,
    String? code,
  }) {
    final text = message.trim();
    if (text.isEmpty) {
      throw ArgumentError.value(message, 'message', 'must not be empty');
    }
    return FoundationError._(
      category: category,
      message: text,
      cause: cause,
      code: code,
    );
  }

  factory FoundationError.validation(
    String message, {
    Object? cause,
    String? code,
  }) {
    return FoundationError(
      category: FoundationErrorCategory.validation,
      message: message,
      cause: cause,
      code: code,
    );
  }

  factory FoundationError.configuration(
    String message, {
    Object? cause,
    String? code,
  }) {
    return FoundationError(
      category: FoundationErrorCategory.configuration,
      message: message,
      cause: cause,
      code: code,
    );
  }

  factory FoundationError.storage(
    String message, {
    Object? cause,
    String? code,
  }) {
    return FoundationError(
      category: FoundationErrorCategory.storage,
      message: message,
      cause: cause,
      code: code,
    );
  }

  factory FoundationError.module(
    String message, {
    Object? cause,
    String? code,
  }) {
    return FoundationError(
      category: FoundationErrorCategory.module,
      message: message,
      cause: cause,
      code: code,
    );
  }

  factory FoundationError.communication(
    String message, {
    Object? cause,
    String? code,
  }) {
    return FoundationError(
      category: FoundationErrorCategory.communication,
      message: message,
      cause: cause,
      code: code,
    );
  }

  const FoundationError._({
    required this.category,
    required this.message,
    required this.cause,
    required this.code,
  });

  final FoundationErrorCategory category;
  final String message;
  final Object? cause;
  final String? code;

  String get safeMessage => message;

  @override
  String toString() => 'FoundationError(${category.name}: $message)';
}

abstract class ErrorReporter {
  void report(FoundationError error);
}
