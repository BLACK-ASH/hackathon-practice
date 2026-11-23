import type { ChatMessage } from '#contracts/messaging.ts';
import type { ConversationId, MessageId, PeerId } from '#types/ids.ts';

/** Private messaging wire format. Opaque to the network module. */
export interface PrivateMessageWire {
  readonly v: 1;
  readonly kind: 'message';
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly senderId: PeerId;
  readonly senderName: string;
  readonly body: string;
  readonly createdAt: number;
}

export interface ReceiptWire {
  readonly v: 1;
  readonly kind: 'receipt';
  readonly messageId: MessageId;
}

export type PrivateWireMessage = PrivateMessageWire | ReceiptWire;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function encodePrivateMessage(message: ChatMessage): Uint8Array {
  const wire: PrivateMessageWire = {
    v: 1,
    kind: 'message',
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.senderName,
    body: message.body,
    createdAt: message.createdAt,
  };
  return encoder.encode(JSON.stringify(wire));
}

export function encodeReceipt(messageId: MessageId): Uint8Array {
  const wire: ReceiptWire = { v: 1, kind: 'receipt', messageId };
  return encoder.encode(JSON.stringify(wire));
}

/** Returns `undefined` for malformed or unsupported payloads. */
export function decodePrivateWire(payload: Uint8Array): PrivateWireMessage | undefined {
  try {
    const value: unknown = JSON.parse(decoder.decode(payload));
    if (!isRecord(value) || value['v'] !== 1) return undefined;

    if (value['kind'] === 'message') {
      if (
        !isText(value['id']) ||
        !isText(value['conversationId']) ||
        !isText(value['senderId']) ||
        !isText(value['senderName']) ||
        typeof value['body'] !== 'string' ||
        value['body'].trim().length === 0 ||
        !isTimestamp(value['createdAt'])
      ) {
        return undefined;
      }
      return {
        v: 1,
        kind: 'message',
        id: value['id'],
        conversationId: value['conversationId'],
        senderId: value['senderId'],
        senderName: value['senderName'],
        body: value['body'],
        createdAt: value['createdAt'],
      };
    }

    if (value['kind'] === 'receipt' && isText(value['messageId'])) {
      return { v: 1, kind: 'receipt', messageId: value['messageId'] };
    }

    return undefined;
  } catch {
    return undefined;
  }
}
