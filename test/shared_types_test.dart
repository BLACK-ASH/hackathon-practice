import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/types/types.dart';

void main() {
  group('PeerId', () {
    test('trims and preserves the identifier', () {
      final id = PeerId('  peer-1  ');

      expect(id.value, 'peer-1');
    });

    test('rejects blank identifiers', () {
      expect(() => PeerId('   '), throwsArgumentError);
    });

    test('uses value equality', () {
      expect(PeerId('peer-1'), PeerId(' peer-1 '));
      expect(PeerId('peer-1').hashCode, PeerId('peer-1').hashCode);
    });
  });

  group('DisplayName', () {
    test('trims and preserves the name', () {
      final name = DisplayName('  Ada  ');

      expect(name.value, 'Ada');
    });

    test('rejects blank names', () {
      expect(() => DisplayName('   '), throwsArgumentError);
    });
  });

  group('TransportPayload', () {
    test('preserves payload text exactly', () {
      final payload = TransportPayload('  {"kind":"ping"}  ');

      expect(payload.value, '  {"kind":"ping"}  ');
    });

    test('rejects blank payloads', () {
      expect(() => TransportPayload('   '), throwsArgumentError);
    });
  });

  group('PeerDescriptor', () {
    test('uses value equality for shared identity data', () {
      final first = PeerDescriptor(
        id: PeerId('peer-1'),
        displayName: DisplayName('Ada'),
      );
      final second = PeerDescriptor(
        id: PeerId('peer-1'),
        displayName: DisplayName('Ada'),
      );

      expect(first, second);
      expect(first.hashCode, second.hashCode);
    });
  });
}
