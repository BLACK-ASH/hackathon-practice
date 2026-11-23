import type { ErrorInfo } from '#contracts/errors.ts';
import type { IdentityProfilePatch } from '#contracts/identity.ts';
import type { Result } from '#types/result.ts';
import { toErrorInfo } from './errors.ts';
import { normalizeDisplayName } from './identity.ts';
import { err, ok } from './result.ts';

export function prepareDisplayNamePatch(
  displayName: string,
): Result<IdentityProfilePatch, ErrorInfo> {
  try {
    return ok({ displayName: normalizeDisplayName(displayName) });
  } catch (error: unknown) {
    return err(toErrorInfo(error));
  }
}
