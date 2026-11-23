import type { AppEvents, EventBus } from '#contracts/events.ts';
import type { IdentityProfilePatch, IdentityService, PeerIdentity } from '#contracts/identity.ts';
import type { IdentityRepository } from '#contracts/storage.ts';
import type { IdGenerator } from '#contracts/ids.ts';
import type { Clock } from '#types/time.ts';
import { AppError } from './errors.ts';

const MAX_DISPLAY_NAME = 40;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export interface IdentityServiceDeps {
  readonly store: IdentityRepository;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly events: EventBus<AppEvents>;
  readonly defaultDisplayName?: string;
  readonly deviceName?: string;
}

export function normalizeDisplayName(value: string): string {
  const displayName = value.trim();
  if (displayName.length === 0) {
    throw new AppError('invalid_argument', 'Display name must not be empty');
  }
  if (displayName.length > MAX_DISPLAY_NAME) {
    throw new AppError(
      'invalid_argument',
      `Display name must be at most ${MAX_DISPLAY_NAME} characters`,
    );
  }
  if (CONTROL_CHARACTERS.test(displayName)) {
    throw new AppError(
      'invalid_argument',
      'Display name must not contain control characters',
    );
  }
  return displayName;
}

function createIdentity(deps: IdentityServiceDeps, peerId: string): PeerIdentity {
  const suffix = peerId.slice(-4).toUpperCase();
  const displayName =
    deps.defaultDisplayName === undefined
      ? `Device ${suffix}`
      : normalizeDisplayName(deps.defaultDisplayName);
  return deps.deviceName === undefined
    ? { peerId, displayName }
    : { peerId, displayName, deviceName: deps.deviceName };
}

/**
 * Core-owned identity lifecycle: generates the peer ID once, persists it
 * through the storage contract, and emits `identity.changed` on creation and
 * profile updates.
 */
export function createIdentityService(
  deps: IdentityServiceDeps,
): IdentityService {
  let cached: PeerIdentity | undefined;
  let loading: Promise<PeerIdentity> | undefined;

  const loadInternal = async (): Promise<PeerIdentity> => {
    const stored = await deps.store.get();
    if (stored !== undefined) {
      cached = stored;
      return stored;
    }
    const identity = createIdentity(deps, deps.ids.newId('peer'));
    await deps.store.save(identity);
    cached = identity;
    deps.events.emit('identity.changed', identity);
    return identity;
  };

  const load = (): Promise<PeerIdentity> => {
    if (cached !== undefined) return Promise.resolve(cached);
    if (loading !== undefined) return loading;
    loading = loadInternal().finally(() => {
      loading = undefined;
    });
    return loading;
  };

  return {
    load,

    current(): PeerIdentity | undefined {
      return cached;
    },

    async updateProfile(patch: IdentityProfilePatch): Promise<PeerIdentity> {
      const base = cached ?? (await load());
      const displayName =
        patch.displayName === undefined
          ? base.displayName
          : normalizeDisplayName(patch.displayName);
      const avatarUrl =
        patch.avatarUrl === undefined
          ? base.avatarUrl
          : patch.avatarUrl.trim() || undefined;
      const { avatarUrl: _previousAvatar, ...rest } = base;
      const next: PeerIdentity =
        avatarUrl === undefined
          ? { ...rest, displayName }
          : { ...rest, displayName, avatarUrl };
      await deps.store.save(next);
      cached = next;
      deps.events.emit('identity.changed', next);
      return next;
    },
  };
}
