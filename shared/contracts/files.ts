import type { AppEvents, EventBus } from './events.ts';
import type { ErrorInfo } from './errors.ts';
import type { PeerId, TransferId } from '../types/ids.ts';

export type TransferDirection = 'incoming' | 'outgoing';
export type TransferState =
  | 'pending'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Platform-neutral input. The platform adapter turns a picked file, node
 * stream or blob into this shape; the transfer module only reads chunks.
 */
export interface FileSource {
  readonly name: string;
  readonly size: number;
  readonly mimeType?: string;
  chunks(): AsyncIterable<Uint8Array>;
}

export interface FileTransferRecord {
  readonly id: TransferId;
  readonly peerId: PeerId;
  readonly direction: TransferDirection;
  readonly fileName: string;
  readonly size: number;
  readonly mimeType?: string;
  readonly transferredBytes: number;
  readonly state: TransferState;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly completedAt?: number;
  /** Platform-specific location used to open the received file. */
  readonly localUri?: string;
  readonly error?: ErrorInfo;
}

export interface FileTransferProgress {
  readonly transferId: TransferId;
  readonly transferredBytes: number;
  readonly totalBytes: number;
}

export interface FileTransferService {
  readonly events: EventBus<AppEvents>;

  send(peerId: PeerId, file: FileSource): Promise<FileTransferRecord>;
  /** Accepts a pending incoming transfer announced by `files.transfer.requested`. */
  acceptTransfer(transferId: TransferId): Promise<FileTransferRecord>;
  /** Rejects a pending incoming transfer. */
  rejectTransfer(transferId: TransferId): Promise<FileTransferRecord>;
  cancel(transferId: TransferId): Promise<void>;
  listTransfers(): Promise<readonly FileTransferRecord[]>;
  getTransfer(id: TransferId): Promise<FileTransferRecord | undefined>;
}
