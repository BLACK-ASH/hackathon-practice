import '../contracts/contracts.dart';

class MockPeerDirectory implements PeerDirectory {
  MockPeerDirectory([PeerSnapshot? snapshot])
      : _snapshot = snapshot ?? PeerSnapshot(<PeerDescriptor>[]);

  final PeerSnapshot _snapshot;

  @override
  Future<PeerSnapshot> knownPeers() async => _snapshot;
}

class MockPeerPayloadSender implements PeerPayloadSender {
  MockPeerPayloadSender({this.errorToThrow});

  final Object? errorToThrow;
  final List<PeerSendRequest> sentRequests = <PeerSendRequest>[];

  @override
  Future<void> send(PeerSendRequest request) async {
    final error = errorToThrow;
    if (error != null) {
      throw error;
    }
    sentRequests.add(request);
  }
}

class MockIdentityStorage implements IdentityStorage {
  MockIdentityStorage({this.identity, this.readError, this.writeError});

  LocalIdentity? identity;
  final Object? readError;
  final Object? writeError;
  int readCount = 0;
  int writeCount = 0;

  LocalIdentity? get storedIdentity => identity;

  @override
  Future<LocalIdentity?> readIdentity() async {
    readCount++;
    final error = readError;
    if (error != null) {
      throw error;
    }
    return identity;
  }

  @override
  Future<void> writeIdentity(LocalIdentity value) async {
    writeCount++;
    final error = writeError;
    if (error != null) {
      throw error;
    }
    identity = value;
  }
}

class MockSettingsStorage implements SettingsStorage {
  MockSettingsStorage({this.config, this.readError, this.writeError});

  ApplicationConfig? config;
  final Object? readError;
  final Object? writeError;
  int readCount = 0;
  int writeCount = 0;

  ApplicationConfig? get storedConfig => config;

  @override
  Future<ApplicationConfig?> readSettings() async {
    readCount++;
    final error = readError;
    if (error != null) {
      throw error;
    }
    return config;
  }

  @override
  Future<void> writeSettings(ApplicationConfig value) async {
    writeCount++;
    final error = writeError;
    if (error != null) {
      throw error;
    }
    config = value;
  }
}

class MockPeerIdGenerator implements PeerIdGenerator {
  MockPeerIdGenerator([List<PeerId>? ids])
      : _ids = List<PeerId>.unmodifiable(
          ids ?? <PeerId>[PeerId('local-device')],
        );

  final List<PeerId> _ids;
  int _index = 0;
  int _fallback = 0;

  @override
  PeerId next() {
    if (_index < _ids.length) {
      return _ids[_index++];
    }
    _fallback++;
    return PeerId('generated-peer-$_fallback');
  }
}

class RecordingErrorReporter implements ErrorReporter {
  final List<FoundationError> errors = <FoundationError>[];

  @override
  void report(FoundationError error) {
    errors.add(error);
  }
}

class StubFoundationModule implements FoundationModule {
  StubFoundationModule({required this.name, this.onInitialize});

  @override
  final String name;
  final Future<ModuleHealth> Function()? onInitialize;

  ModuleHealth? _health;

  @override
  ModuleHealth get health =>
      _health ??
      ModuleHealth(moduleName: name, status: ModuleStatus.notInitialized);

  @override
  Future<ModuleHealth> initialize() async {
    _health = ModuleHealth(moduleName: name, status: ModuleStatus.initializing);
    final initializer = onInitialize;
    final result = initializer == null
        ? ModuleHealth(moduleName: name, status: ModuleStatus.ready)
        : await initializer();
    _health = result;
    return result;
  }

  @override
  Future<void> dispose() async {
    _health = ModuleHealth(moduleName: name, status: ModuleStatus.disposed);
  }
}
