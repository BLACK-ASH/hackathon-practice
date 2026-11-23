import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger_shared/contracts/contracts.dart';

void main() {
  test('typed errors preserve context without exposing causes as safe text', () {
    final cause = StateError('disk unavailable');

    final error = FoundationError.storage(
      'Unable to save identity.',
      cause: cause,
      code: 'IDENTITY_WRITE',
    );

    expect(error.category, FoundationErrorCategory.storage);
    expect(error.message, 'Unable to save identity.');
    expect(error.safeMessage, 'Unable to save identity.');
    expect(error.cause, same(cause));
    expect(error.code, 'IDENTITY_WRITE');
    expect(error.toString(), contains('storage'));
    expect(error.toString(), isNot(contains('disk unavailable')));
  });

  test('blank messages are rejected', () {
    expect(
      () => FoundationError.validation('   '),
      throwsArgumentError,
    );
  });
}
