import 'package:material_ui/material_ui.dart';

import 'src/app.dart';
import 'src/foundation/foundation.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final components = FoundationComponents.forDevelopment();
  await components.initialize();
  runApp(P2PLanMessengerApp(components: components));
}
