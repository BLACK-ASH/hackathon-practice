import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';
import 'package:p2p_lan_messenger_shared/foundation/foundation.dart';
import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';
import 'modules/configuration_module.dart';
import 'modules/identity_module.dart';

class FoundationComponents {
  FoundationComponents({
    required this.eventBus,
    required this.errorReporter,
    required this.identityManager,
    required this.configurationManager,
    required this.peerDirectory,
    required this.peerPayloadSender,
    required this.moduleRegistry,
  });

  factory FoundationComponents.forDevelopment() {
    final errorReporter = RecordingErrorReporter();
    final eventBus = FoundationEventBus(errorReporter: errorReporter);
    final identityManager = IdentityManager(
      storage: MockIdentityStorage(),
      idGenerator: MockPeerIdGenerator(),
      eventBus: eventBus,
    );
    final configurationManager = ConfigurationManager(
      storage: MockSettingsStorage(),
      eventBus: eventBus,
    );
    final moduleRegistry = ModuleRegistry(
      eventBus: eventBus,
      errorReporter: errorReporter,
    );

    moduleRegistry.register(IdentityModule(identityManager));
    moduleRegistry.register(ConfigurationModule(configurationManager));

    return FoundationComponents(
      eventBus: eventBus,
      errorReporter: errorReporter,
      identityManager: identityManager,
      configurationManager: configurationManager,
      peerDirectory: MockPeerDirectory(),
      peerPayloadSender: MockPeerPayloadSender(),
      moduleRegistry: moduleRegistry,
    );
  }

  final EventBus eventBus;
  final ErrorReporter errorReporter;
  final IdentityManager identityManager;
  final ConfigurationManager configurationManager;
  final PeerDirectory peerDirectory;
  final PeerPayloadSender peerPayloadSender;
  final ModuleRegistry moduleRegistry;

  Future<ModuleInitializationReport> initialize() {
    return moduleRegistry.initializeAll(
      timeout: ApplicationConfig.defaults().moduleInitializationTimeout,
    );
  }
}
