import 'dart:async';

import '../../contracts/contracts.dart';

class ModuleInitializationReport {
  const ModuleInitializationReport({required this.modules});

  final List<ModuleHealth> modules;

  bool get allReady => modules.every((health) => health.isHealthy);

  Iterable<ModuleHealth> get failed =>
      modules.where((health) => health.status == ModuleStatus.failed);
}

class ModuleRegistry {
  ModuleRegistry({
    required this._eventBus,
    required this._errorReporter,
  });

  static const String _eventSource = 'ModuleRegistry';

  final EventBus _eventBus;
  final ErrorReporter _errorReporter;
  final Map<String, FoundationModule> _modules =
      <String, FoundationModule>{};
  final List<ModuleHealth> _health = <ModuleHealth>[];

  List<ModuleHealth> get health => List<ModuleHealth>.unmodifiable(_health);

  List<String> get registeredNames =>
      List<String>.unmodifiable(_modules.keys);

  void register(FoundationModule module) {
    final name = module.name.trim();
    if (name.isEmpty) {
      throw FoundationError.validation('Module name must not be empty.');
    }
    if (_modules.containsKey(name)) {
      throw FoundationError.module('Module "$name" is already registered.');
    }
    _modules[name] = module;
    _health.add(
      ModuleHealth(moduleName: name, status: ModuleStatus.notInitialized),
    );
  }

  Future<ModuleInitializationReport> initializeAll({
    Duration timeout = const Duration(seconds: 5),
  }) async {
    _health.clear();
    for (final entry in _modules.entries) {
      final health = await _initializeOne(entry.key, entry.value, timeout);
      _health.add(health);
      _eventBus.publish(
        ModuleStatusChanged(source: _eventSource, health: health),
      );
    }
    return ModuleInitializationReport(
      modules: List<ModuleHealth>.unmodifiable(_health),
    );
  }

  Future<void> disposeAll() async {
    for (final entry in _modules.entries) {
      try {
        await entry.value.dispose();
      } catch (error) {
        _errorReporter.report(
          FoundationError.module(
            'Disposal failed for module "${entry.key}".',
            cause: error,
          ),
        );
      }
      final health = ModuleHealth(
        moduleName: entry.key,
        status: ModuleStatus.disposed,
      );
      _replaceHealth(health);
      _eventBus.publish(
        ModuleStatusChanged(source: _eventSource, health: health),
      );
    }
  }

  Future<ModuleHealth> _initializeOne(
    String name,
    FoundationModule module,
    Duration timeout,
  ) async {
    try {
      return await module.initialize().timeout(timeout);
    } on TimeoutException catch (error) {
      _errorReporter.report(
        FoundationError.module(
          'Initialization timed out for module "$name".',
          cause: error,
        ),
      );
      return _failedHealth(name, 'Initialization timed out.');
    } on FoundationError catch (error) {
      _errorReporter.report(error);
      return _failedHealth(name, error.safeMessage);
    } catch (error) {
      _errorReporter.report(
        FoundationError.module(
          'Initialization failed for module "$name".',
          cause: error,
        ),
      );
      return _failedHealth(name, 'Initialization failed.');
    }
  }

  ModuleHealth _failedHealth(String name, String detail) {
    return ModuleHealth(
      moduleName: name,
      status: ModuleStatus.failed,
      detail: detail,
    );
  }

  void _replaceHealth(ModuleHealth health) {
    final index = _health.indexWhere((item) => item.moduleName == health.moduleName);
    if (index == -1) {
      _health.add(health);
      return;
    }
    _health[index] = health;
  }
}
