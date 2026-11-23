import 'package:material_ui/material_ui.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key, this.displayName});

  final String? displayName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('P2P LAN Messenger'),
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.chat_bubble_outline, size: 64),
            const SizedBox(height: 16),
            const Text('Conversations will appear here.'),
            if (displayName != null) ...[
              const SizedBox(height: 8),
              Text('Local identity: $displayName'),
            ],
          ],
        ),
      ),
    );
  }
}
