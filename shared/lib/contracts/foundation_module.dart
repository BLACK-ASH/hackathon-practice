import '../types/module_health.dart';

abstract class FoundationModule {
  String get name;

  Future<ModuleHealth> initialize();

  ModuleHealth get health;

  Future<void> dispose();
}
