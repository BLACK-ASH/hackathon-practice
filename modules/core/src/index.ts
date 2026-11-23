export { AppError, toErrorInfo } from './errors.ts';
export type { AppErrorOptions } from './errors.ts';

export { ok, err, isOk, isErr } from './result.ts';

export { createIdGenerator, systemIdGenerator } from './ids.ts';
export { systemClock } from './clock.ts';

export { createLogger } from './logging.ts';
export type { CreateLoggerOptions } from './logging.ts';

export { loadConfig } from './config.ts';

export { TypedEventBus } from './events.ts';
export type { EventBusOptions } from './events.ts';

export { DefaultModuleRegistry } from './lifecycle.ts';
export type { ModuleRegistryOptions } from './lifecycle.ts';

export { createIdentityService, normalizeDisplayName } from './identity.ts';
export type { IdentityServiceDeps } from './identity.ts';

export { withTimeout } from './timeout.ts';
