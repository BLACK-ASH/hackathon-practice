import 'dart:convert';

import 'errors.dart';
import 'session.dart';

const _unset = _Unset();

class _Unset {
  const _Unset();
}

typedef SettingValidator = void Function(Object? value);

class SettingDefinition<T> {
  SettingDefinition({
    required this.key,
    Object? defaultValue = _unset,
    this.validator,
    this.description = '',
  }) : defaultValue = _copyValue(defaultValue) {
    try {
      _validateKey(key);
      if (validator != null) {
        validateValue(this.defaultValue);
      }
    } on InvalidSettingException catch (error) {
      throw StorageConfigurationException(error.message, cause: error);
    }
  }

  final String key;
  final Object? defaultValue;
  final SettingValidator? validator;
  final String description;

  bool get hasDefault => !identical(defaultValue, _unset);

  void validateValue(Object? value) {
    final SettingValidator? check = validator;
    if (check == null) {
      return;
    }
    try {
      check(value);
    } on InvalidSettingException {
      rethrow;
    } catch (error) {
      throw InvalidSettingException(
        "Invalid value for setting '$key'",
        cause: error,
      );
    }
  }
}

SettingDefinition<String> stringSetting(
  String key, {
  Object? defaultValue = _unset,
  Set<String>? allowed,
  int? minLength,
  int? maxLength,
  String description = '',
}) {
  void validate(Object? value) {
    if (value is! String) {
      throw ArgumentError('must be a string');
    }
    if (allowed != null && !allowed.contains(value)) {
      throw ArgumentError('must be one of ${allowed.toList()..sort()}');
    }
    if (minLength != null && value.length < minLength) {
      throw ArgumentError('must contain at least $minLength character(s)');
    }
    if (maxLength != null && value.length > maxLength) {
      throw ArgumentError('must contain at most $maxLength character(s)');
    }
  }

  return SettingDefinition<String>(
    key: key,
    defaultValue: defaultValue,
    validator: validate,
    description: description,
  );
}

SettingDefinition<int> integerSetting(
  String key, {
  Object? defaultValue = _unset,
  int? minimum,
  int? maximum,
  String description = '',
}) {
  void validate(Object? value) {
    if (value is! int) {
      throw ArgumentError('must be an integer');
    }
    if (minimum != null && value < minimum) {
      throw ArgumentError('must be at least $minimum');
    }
    if (maximum != null && value > maximum) {
      throw ArgumentError('must be at most $maximum');
    }
  }

  return SettingDefinition<int>(
    key: key,
    defaultValue: defaultValue,
    validator: validate,
    description: description,
  );
}

SettingDefinition<bool> booleanSetting(
  String key, {
  Object? defaultValue = _unset,
  String description = '',
}) {
  void validate(Object? value) {
    if (value is! bool) {
      throw ArgumentError('must be a boolean');
    }
  }

  return SettingDefinition<bool>(
    key: key,
    defaultValue: defaultValue,
    validator: validate,
    description: description,
  );
}

SettingDefinition<Object?> jsonSetting(
  String key, {
  Object? defaultValue = _unset,
  String description = '',
}) {
  void validate(Object? value) {
    _encodeValue(key, value);
  }

  return SettingDefinition<Object?>(
    key: key,
    defaultValue: defaultValue,
    validator: validate,
    description: description,
  );
}

class SettingsStore {
  SettingsStore(
    StorageSession session, [
    Iterable<SettingDefinition<Object?>> definitions = const [],
  ]) : _session = session {
    defineMany(definitions);
  }

  final StorageSession _session;
  final Map<String, SettingDefinition<Object?>> _definitions = {};

  Map<String, SettingDefinition<Object?>> get definitions =>
      Map<String, SettingDefinition<Object?>>.unmodifiable(_definitions);

  void define(SettingDefinition<Object?> definition) {
    final existing = _definitions[definition.key];
    if (existing != null && !identical(existing, definition)) {
      throw StorageConfigurationException(
        "Setting '${definition.key}' is already defined",
      );
    }
    _definitions[definition.key] = definition;
  }

  void defineMany(Iterable<SettingDefinition<Object?>> definitions) {
    for (final definition in definitions) {
      define(definition);
    }
  }

  bool isDefined(String key) {
    _validateKey(key);
    return _definitions.containsKey(key);
  }

  Future<bool> has(String key) async {
    _validateKey(key);
    final row = await _session.queryOne(
      'SELECT 1 AS present FROM settings WHERE key = ?',
      [key],
    );
    return row != null;
  }

  Future<T> get<T>(String key) async {
    _validateKey(key);
    final row = await _session.queryOne(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    if (row == null) {
      final definition = _definitions[key];
      if (definition != null && definition.hasDefault) {
        return _copyValue(definition.defaultValue) as T;
      }
      throw SettingNotFoundException("Setting '$key' has no stored value");
    }

    final decoded = _decodeValue(key, row['value']);
    final definition = _definitions[key];
    if (definition != null) {
      try {
        definition.validateValue(decoded);
      } on InvalidSettingException catch (error) {
        throw CorruptedSettingException(
          "Stored value for setting '$key' is invalid",
          cause: error,
        );
      }
    }
    if (decoded is! T) {
      throw CorruptedSettingException(
        "Stored value for setting '$key' has an unexpected type",
      );
    }
    return decoded;
  }

  Future<T> getOrDefault<T>(String key, T fallback) async {
    try {
      return await get<T>(key);
    } on SettingNotFoundException {
      return fallback;
    }
  }

  Future<void> set(String key, Object? value) async {
    _validateKey(key);
    final definition = _definitions[key];
    if (definition != null) {
      definition.validateValue(value);
    }
    final encoded = _encodeValue(key, value);
    await _session.execute(
      '''
INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at
''',
      [key, encoded, _now()],
    );
  }

  Future<void> update(String key, Object? value) async {
    _validateKey(key);
    if (!await has(key)) {
      throw SettingNotFoundException("Setting '$key' is not stored");
    }
    await set(key, value);
  }

  Future<bool> delete(String key) async {
    _validateKey(key);
    final count = await _session.update(
      'DELETE FROM settings WHERE key = ?',
      [key],
    );
    return count > 0;
  }

  Future<Map<String, Object?>> getAll() async {
    final rows = await _session.queryAll(
      'SELECT key, value FROM settings ORDER BY key',
    );
    final values = <String, Object?>{};
    for (final row in rows) {
      final key = row['key'];
      if (key is! String) {
        throw CorruptedSettingException('A stored setting has an invalid key');
      }
      try {
        _validateKey(key);
      } on InvalidSettingException catch (error) {
        throw CorruptedSettingException(
          'A stored setting has an invalid key',
          cause: error,
        );
      }
      final decoded = _decodeValue(key, row['value']);
      final definition = _definitions[key];
      if (definition != null) {
        try {
          definition.validateValue(decoded);
        } on InvalidSettingException catch (error) {
          throw CorruptedSettingException(
            "Stored value for setting '$key' is invalid",
            cause: error,
          );
        }
      }
      values[key] = decoded;
    }
    return values;
  }

  Future<void> reset(String key) async {
    _validateKey(key);
    final definition = _definitions[key];
    if (definition != null && definition.hasDefault) {
      await set(key, definition.defaultValue);
      return;
    }
    await delete(key);
  }

  Future<int> resetAll() {
    return _session.update('DELETE FROM settings');
  }

  Future<int> count() async {
    final value = await _session.scalar(
      'SELECT COUNT(*) AS total FROM settings',
    );
    return value is int ? value : 0;
  }
}

void _validateKey(String key) {
  final valid = RegExp(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$').hasMatch(key);
  if (!valid) {
    throw InvalidSettingException(
      "Setting key must be 1-128 characters using letters, digits, '.', '_' or '-'",
    );
  }
}

Object? _copyValue(Object? value) {
  if (identical(value, _unset) || value == null) {
    return value;
  }
  if (value is Map || value is List) {
    try {
      return jsonDecode(jsonEncode(value));
    } catch (error) {
      throw StorageConfigurationException(
        'Setting default values must be JSON-serializable',
        cause: error,
      );
    }
  }
  return value;
}

String _encodeValue(String key, Object? value) {
  try {
    return jsonEncode(value);
  } on InvalidSettingException {
    rethrow;
  } catch (error) {
    throw InvalidSettingException(
      "Setting '$key' is not JSON-serializable",
      cause: error,
    );
  }
}

Object? _decodeValue(String key, Object? raw) {
  if (raw is! String) {
    throw CorruptedSettingException(
      "Stored value for setting '$key' is not text",
    );
  }
  try {
    return jsonDecode(raw);
  } on FormatException catch (error) {
    throw CorruptedSettingException(
      "Stored value for setting '$key' is not valid JSON",
      cause: error,
    );
  }
}

String _now() => DateTime.now().toUtc().toIso8601String();
