import 'module_status.dart';

class ModuleHealth {
  factory ModuleHealth({
    required String moduleName,
    required ModuleStatus status,
    String? detail,
  }) {
    final name = moduleName.trim();
    if (name.isEmpty) {
      throw ArgumentError.value(moduleName, 'moduleName', 'must not be empty');
    }
    return ModuleHealth._(moduleName: name, status: status, detail: detail);
  }

  const ModuleHealth._({
    required this.moduleName,
    required this.status,
    required this.detail,
  });

  final String moduleName;
  final ModuleStatus status;
  final String? detail;

  bool get isHealthy => status == ModuleStatus.ready;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ModuleHealth &&
          other.moduleName == moduleName &&
          other.status == status &&
          other.detail == detail;

  @override
  int get hashCode => Object.hash(moduleName, status, detail);

  @override
  String toString() =>
      'ModuleHealth(moduleName: $moduleName, status: ${status.name}, '
      'detail: $detail)';
}
