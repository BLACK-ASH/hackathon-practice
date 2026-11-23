import 'package:flutter_test/flutter_test.dart';

import 'package:p2p_lan_messenger/src/app.dart';
import 'package:p2p_lan_messenger/src/foundation/foundation.dart';

void main() {
  testWidgets('renders the messenger home screen', (WidgetTester tester) async {
    final components = FoundationComponents.forDevelopment();
    await components.initialize();

    await tester.pumpWidget(P2PLanMessengerApp(components: components));

    expect(find.text('P2P LAN Messenger'), findsOneWidget);
    expect(find.text('Conversations will appear here.'), findsOneWidget);
    expect(find.textContaining('Local identity:'), findsOneWidget);
  });
}
