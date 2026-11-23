import '../types/application_config.dart';
import '../types/local_identity.dart';
import '../types/module_health.dart';

abstract class FoundationEvent {
  const FoundationEvent({required this.source});

  final String source;
}

class IdentityChanged extends FoundationEvent {
  const IdentityChanged({required super.source, required this.identity});

  final LocalIdentity identity;
}

class ConfigurationChanged extends FoundationEvent {
  const ConfigurationChanged({required super.source, required this.config});

  final ApplicationConfig config;
}

class ModuleStatusChanged extends FoundationEvent {
  const ModuleStatusChanged({required super.source, required this.health});

  final ModuleHealth health;
}

abstract class EventSubscription {
  bool get isActive;

  void cancel();
}

abstract class EventBus {
  EventSubscription subscribe<T extends FoundationEvent>(
    void Function(T event) handler,
  );

  void publish(FoundationEvent event);
}
