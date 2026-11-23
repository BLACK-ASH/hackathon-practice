import 'package:material_ui/material_ui.dart';

import 'foundation/foundation.dart';
import 'home_page.dart';

class P2PLanMessengerApp extends StatelessWidget {
  const P2PLanMessengerApp({super.key, required this.components});

  final FoundationComponents components;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'P2P LAN Messenger',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: HomePage(
        displayName: components.identityManager.current?.displayName.value,
      ),
    );
  }
}
