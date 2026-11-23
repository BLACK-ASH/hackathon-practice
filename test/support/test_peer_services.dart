import 'package:p2p_lan_messenger_shared/mocks/mocks.dart';

class TestPeerDirectory extends MockPeerDirectory {
  TestPeerDirectory(super.snapshot);
}

class TestPeerPayloadSender extends MockPeerPayloadSender {
  TestPeerPayloadSender({super.errorToThrow});
}
