import '../../contracts/contracts.dart';

class ConfigurationManager {
  ConfigurationManager({
    required this._storage,
    required this._eventBus,
  });

  static const String _eventSource = 'ConfigurationManager';

  final SettingsStorage _storage;
  final EventBus _eventBus;

  ApplicationConfig? _current;

  ApplicationConfig? get current => _current;

  Future<ApplicationConfig> load() async {
    try {
      final stored = await _storage.readSettings();
      final config = stored ?? ApplicationConfig.defaults();
      if (stored == null) {
        await _storage.writeSettings(config);
      }
      _current = config;
      _eventBus.publish(
        ConfigurationChanged(source: _eventSource, config: config),
      );
      return config;
    } on FoundationError {
      rethrow;
    } on ArgumentError catch (error) {
      throw FoundationError.configuration(
        'Invalid application configuration.',
        cause: error,
      );
    } catch (error) {
      throw FoundationError.configuration(
        'Unable to load application configuration.',
        cause: error,
      );
    }
  }

  Future<ApplicationConfig> update(ApplicationConfig config) async {
    try {
      await _storage.writeSettings(config);
    } on FoundationError {
      rethrow;
    } on ArgumentError catch (error) {
      throw FoundationError.configuration(
        'Invalid application configuration.',
        cause: error,
      );
    } catch (error) {
      throw FoundationError.configuration(
        'Unable to persist application configuration.',
        cause: error,
      );
    }

    _current = config;
    _eventBus.publish(
      ConfigurationChanged(source: _eventSource, config: config),
    );
    return config;
  }
}
