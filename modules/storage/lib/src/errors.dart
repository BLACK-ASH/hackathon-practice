class StorageException implements Exception {
  StorageException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => '$runtimeType: $message';
}

class StorageConfigurationException extends StorageException {
  StorageConfigurationException(super.message, {super.cause});
}

class StorageInitializationException extends StorageException {
  StorageInitializationException(super.message, {super.cause});
}

class StorageNotInitializedException extends StorageException {
  StorageNotInitializedException(super.message, {super.cause});
}

class DatabaseOperationException extends StorageException {
  DatabaseOperationException(super.message, {super.cause});
}

class MigrationException extends StorageException {
  MigrationException(super.message, {super.cause});
}

class SettingException extends StorageException {
  SettingException(super.message, {super.cause});
}

class SettingNotFoundException extends SettingException {
  SettingNotFoundException(super.message, {super.cause});
}

class InvalidSettingException extends SettingException {
  InvalidSettingException(super.message, {super.cause});
}

class CorruptedSettingException extends SettingException {
  CorruptedSettingException(super.message, {super.cause});
}
