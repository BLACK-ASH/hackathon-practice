import type { PeerId } from '../types/ids.ts';

/**
 * Stable local identity plus the public profile other peers see. The peer ID
 * never changes for an installation; the display name and avatar can.
 */
export interface PeerIdentity {
  readonly peerId: PeerId;
  readonly displayName: string;
  readonly deviceName?: string;
  readonly avatarUrl?: string;
}

export interface IdentityProfilePatch {
  readonly displayName?: string;
  /** Empty string clears the avatar. Omit to keep the current value. */
  readonly avatarUrl?: string;
}

/**
 * Owned by Core; persistence is delegated to the storage module's
 * IdentityRepository. Implementations must be safe to call more than once.
 */
export interface IdentityService {
  load(): Promise<PeerIdentity>;
  /** Synchronous access to the loaded identity, if `load` has completed. */
  current(): PeerIdentity | undefined;
  updateProfile(patch: IdentityProfilePatch): Promise<PeerIdentity>;
}
