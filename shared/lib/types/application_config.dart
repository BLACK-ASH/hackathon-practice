class ApplicationConfig {
  factory ApplicationConfig({
    Duration moduleInitializationTimeout = const Duration(seconds: 5),
    bool initializeModulesOnStartup = true,
  }) {
    if (moduleInitializationTimeout <= Duration.zero) {
      throw ArgumentError.value(
        moduleInitializationTimeout,
        'moduleInitializationTimeout',
        'must be greater than zero',
      );
    }
    return ApplicationConfig._(
      moduleInitializationTimeout: moduleInitializationTimeout,
      initializeModulesOnStartup: initializeModulesOnStartup,
    );
  }

  factory ApplicationConfig.defaults() {
    return ApplicationConfig._(
      moduleInitializationTimeout: const Duration(seconds: 5),
      initializeModulesOnStartup: true,
    );
  }

  const ApplicationConfig._({
    required this.moduleInitializationTimeout,
    required this.initializeModulesOnStartup,
  });

  final Duration moduleInitializationTimeout;
  final bool initializeModulesOnStartup;

  ApplicationConfig copyWith({
    Duration? moduleInitializationTimeout,
    bool? initializeModulesOnStartup,
  }) {
    return ApplicationConfig(
      moduleInitializationTimeout:
          moduleInitializationTimeout ?? this.moduleInitializationTimeout,
      initializeModulesOnStartup:
          initializeModulesOnStartup ?? this.initializeModulesOnStartup,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApplicationConfig &&
          other.moduleInitializationTimeout == moduleInitializationTimeout &&
          other.initializeModulesOnStartup == initializeModulesOnStartup;

  @override
  int get hashCode =>
      Object.hash(moduleInitializationTimeout, initializeModulesOnStartup);

  @override
  String toString() =>
      'ApplicationConfig(moduleInitializationTimeout: '
      '$moduleInitializationTimeout, initializeModulesOnStartup: '
      '$initializeModulesOnStartup)';
}
