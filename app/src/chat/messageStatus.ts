import type { MessageStatus } from '#contracts/messaging.ts';

export function messageStatusLabel(status: MessageStatus): string {
  switch (status) {
    case 'pending':
      return 'Sending';
    case 'sent':
      return 'Sent';
    case 'delivered':
      return 'Delivered';
    case 'failed':
      return 'Failed';
    case 'received':
      return 'Received';
  }
}
