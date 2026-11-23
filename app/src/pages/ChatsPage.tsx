import { Inbox } from '../chat/Inbox';
import { useMessenger } from '../integration/MessengerProvider';

export function ChatsPage() {
  const { state, error, conversations, peers, isMock } = useMessenger();

  return (
    <Inbox
      conversations={conversations}
      error={error}
      isMock={isMock}
      peers={peers}
      state={state}
    />
  );
}
