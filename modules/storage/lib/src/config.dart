import 'dart:io';

import 'package:path/path.dart' as p;

import 'errors.dart';
import 'migrations.dart';
import 'settings.dart';

const defaultAppName = 'P2PLanMessenger';
const databaseFileName = 'storage.db';
const dataDirectoryEnvironment = 'P2P_LAN_MESSENGER_DATA_DIR';

String defaultDataDirectory({String appName = defaultAppName}) {
  final override = Platform.environment[dataDirectoryEnvironment]?.trim();
  if (override != null && override.isNotEmpty) {
    return override;
  }

  if (Platform.isAndroid || Platform.isIOS) {
    throw StorageConfigurationException(
      'A databasePath must be supplied by the mobile application shell',
    );
  }

  final home = Platform.environment['HOME'] ??
      Platform.environment['USERPROFILE'] ??
      Directory.current.path;

  if (Platform.isWindows) {
    final appData = Platform.environment['APPDATA']?.trim();
    if (appData != null && appData.isNotEmpty) {
      return p.join(appData, appName);
    }
    return p.join(home, 'AppData', 'Roaming', appName);
  }

  if (Platform.isMacOS) {
    return p.join(home, 'Library', 'Application Support', appName);
  }

  final xdgDataHome = Platform.environment['XDG_DATA_HOME']?.trim();
  if (xdgDataHome != null && xdgDataHome.isNotEmpty) {
    return p.join(xdgDataHome, appName);
  }
  return p.join(home, '.local', 'share', appName);
}

String defaultDatabasePath({
  String appName = defaultAppName,
  String fileName = databaseFileName,
}) {
  return p.join(defaultDataDirectory(appName: appName), fileName);
}

class StorageConfig {
  StorageConfig({
    String? databasePath,
    this.appName = defaultAppName,
    this.busyTimeoutMs = 5000,
    this.enableWal = true,
    Iterable<StorageMigration> additionalMigrations = const [],
    Iterable<SettingDefinition<Object?>> settingDefinitions = const [],
  })  : databasePath = _validatePath(databasePath),
        additionalMigrations =
            List<StorageMigration>.unmodifiable(additionalMigrations),
        settingDefinitions =
            List<SettingDefinition<Object?>>.unmodifiable(settingDefinitions) {
    if (appName.trim().isEmpty) {
      throw StorageConfigurationException('appName must be a non-empty string');
    }
    if (busyTimeoutMs < 0) {
      throw StorageConfigurationException(
        'busyTimeoutMs must be a non-negative integer',
      );
    }
  }

  final String? databasePath;
  final String appName;
  final int busyTimeoutMs;
  final bool enableWal;
  final List<StorageMigration> additionalMigrations;
  final List<SettingDefinition<Object?>> settingDefinitions;

  String get resolvedDatabasePath =>
      databasePath ?? defaultDatabasePath(appName: appName);

  static String? _validatePath(String? value) {
    if (value == null) {
      return null;
    }
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      throw StorageConfigurationException('databasePath must be a file path');
    }
    if (trimmed == '.' || trimmed == '..') {
      throw StorageConfigurationException('databasePath must be a file path');
    }
    return value;
  }
}
