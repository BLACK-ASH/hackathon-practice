import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/foundation/foundation.dart';

class IdentityModule implements FoundationModule {
  IdentityModule(this._manager);

  static const String moduleName = 'identity';

  final IdentityManager _manager;

  ModuleHealth _health = ModuleHealth(
    moduleName: moduleName,
    status: ModuleStatus.notInitialized,
  );

  @override
  String get name => moduleName;

  @override
  ModuleHealth get health => _health;

  @override
  Future<ModuleHealth> initialize() async {
    try {
      await _manager.loadOrCreate(
        initialDisplayName: DisplayName('Local User'),
      );
      _health = ModuleHealth(moduleName: moduleName, status: ModuleStatus.ready);
    } on FoundationError catch (error) {
      _health = ModuleHealth(
        moduleName: moduleName,
        status: ModuleStatus.failed,
        detail: error.safeMessage,
      );
      rethrow;
    } catch (error) {
      _health = ModuleHealth(
        moduleName: moduleName,
        status: ModuleStatus.failed,
        detail: 'Identity initialization failed.',
      );
      throw FoundationError.module(
        'Identity module initialization failed.',
        cause: error,
      );
    }
    return _health;
  }

  @override
  Future<void> dispose() async {
    _health = ModuleHealth(
      moduleName: moduleName,
      status: ModuleStatus.disposed,
    );
  }
}
