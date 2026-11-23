import '../types/local_identity.dart';

abstract class IdentityStorage {
  Future<LocalIdentity?> readIdentity();

  Future<void> writeIdentity(LocalIdentity identity);
}
