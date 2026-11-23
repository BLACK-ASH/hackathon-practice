import '../types/application_config.dart';

abstract class SettingsStorage {
  Future<ApplicationConfig?> readSettings();

  Future<void> writeSettings(ApplicationConfig config);
}
