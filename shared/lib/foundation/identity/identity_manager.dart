import '../../contracts/contracts.dart';

class IdentityManager {
  IdentityManager({
    required this._storage,
    required this._idGenerator,
    required this._eventBus,
  });

  static const String _eventSource = 'IdentityManager';

  final IdentityStorage _storage;
  final PeerIdGenerator _idGenerator;
  final EventBus _eventBus;

  LocalIdentity? _current;

  LocalIdentity? get current => _current;

  Future<LocalIdentity> loadOrCreate({DisplayName? initialDisplayName}) async {
    try {
      final stored = await _storage.readIdentity();
      if (stored != null) {
        _current = stored;
        return stored;
      }

      final identity = LocalIdentity(
        id: _idGenerator.next(),
        displayName: initialDisplayName ?? DisplayName('Local User'),
      );
      await _storage.writeIdentity(identity);
      _current = identity;
      _eventBus.publish(
        IdentityChanged(source: _eventSource, identity: identity),
      );
      return identity;
    } on FoundationError {
      rethrow;
    } on ArgumentError catch (error) {
      throw FoundationError.validation(
        'Invalid identity data.',
        cause: error,
      );
    } catch (error) {
      throw FoundationError.storage(
        'Unable to load or create local identity.',
        cause: error,
      );
    }
  }

  Future<LocalIdentity> updateDisplayName(DisplayName displayName) async {
    final existing = _current;
    if (existing == null) {
      throw FoundationError.validation(
        'Identity must be loaded before it can be updated.',
      );
    }

    final updated = existing.withDisplayName(displayName);
    try {
      await _storage.writeIdentity(updated);
    } on FoundationError {
      rethrow;
    } on ArgumentError catch (error) {
      throw FoundationError.validation(
        'Invalid display name.',
        cause: error,
      );
    } catch (error) {
      throw FoundationError.storage(
        'Unable to persist the updated identity.',
        cause: error,
      );
    }

    _current = updated;
    _eventBus.publish(
      IdentityChanged(source: _eventSource, identity: updated),
    );
    return updated;
  }
}
