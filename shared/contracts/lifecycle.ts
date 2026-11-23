import type { AppConfig } from './config.ts';
import type { AppEvents, EventBus } from './events.ts';
import type { ErrorInfo } from './errors.ts';
import type { Logger } from './logging.ts';
import type { Clock } from '../types/time.ts';
import type { ModuleId } from '../types/ids.ts';

export type ModuleStatus =
  | 'registered'
  | 'starting'
  | 'ready'
  | 'degraded'
  | 'failed'
  | 'stopped';

/** Statuses a running module may report about itself. */
export type ModuleReportStatus = 'ready' | 'degraded' | 'failed';

export interface ModuleHealth {
  readonly status: ModuleStatus;
  readonly message?: string;
  readonly error?: ErrorInfo;
  readonly updatedAt: number;
}

export interface ModuleHealthReport extends ModuleHealth {
  readonly moduleId: ModuleId;
  readonly optional: boolean;
}

export interface ModuleContext {
  readonly moduleId: ModuleId;
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly events: EventBus<AppEvents>;
  /** Aborted when the module times out or the registry shuts down. */
  readonly signal: AbortSignal;
  report(status: ModuleReportStatus, message?: string): void;
  /** Cleanup runs on shutdown (LIFO) even if shutdown throws. */
  onCleanup(cleanup: () => void | Promise<void>): void;
}

/**
 * A feature or infrastructure module. Modules receive their feature
 * dependencies through their constructors; the lifecycle context only carries
 * foundation services.
 */
export interface AppModule {
  readonly id: ModuleId;
  readonly name?: string;
  /** Optional modules are reported as failed without blocking the app. */
  readonly optional?: boolean;
  initialize(context: ModuleContext): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface ModuleStartResult {
  readonly moduleId: ModuleId;
  readonly status: ModuleStatus;
  readonly error?: ErrorInfo;
}

export interface ModuleStartReport {
  readonly startedAt: number;
  readonly durationMs: number;
  readonly modules: readonly ModuleStartResult[];
  readonly failed: readonly ModuleId[];
}

export interface ModuleRegistry {
  register(module: AppModule): void;
  start(): Promise<ModuleStartReport>;
  stop(): Promise<void>;
  health(): readonly ModuleHealthReport[];
  get<T extends AppModule = AppModule>(moduleId: ModuleId): T | undefined;
}
