import type { AppConfig } from '#contracts/config.ts';
import type { AppEvents, EventBus } from '#contracts/events.ts';
import type {
  AppModule,
  ModuleContext,
  ModuleHealth,
  ModuleHealthReport,
  ModuleRegistry,
  ModuleReportStatus,
  ModuleStartReport,
  ModuleStartResult,
} from '#contracts/lifecycle.ts';
import type { Logger } from '#contracts/logging.ts';
import type { Clock } from '#types/time.ts';
import type { ModuleId } from '#types/ids.ts';
import { AppError, toErrorInfo } from './errors.ts';
import { withTimeout } from './timeout.ts';

type Cleanup = () => void | Promise<void>;

interface ModuleRecord {
  readonly module: AppModule;
  readonly cleanups: Cleanup[];
  health: ModuleHealth;
  context?: ModuleContext;
  abort?: AbortController;
  attempted: boolean;
}

export interface ModuleRegistryOptions {
  readonly logger: Logger;
  readonly clock: Clock;
  readonly events: EventBus<AppEvents>;
  readonly config: AppConfig;
  /** 0 disables the init timeout. Defaults to 10 seconds. */
  readonly initTimeoutMs?: number;
  /** 0 disables the shutdown timeout. Defaults to initTimeoutMs. */
  readonly shutdownTimeoutMs?: number;
}

/**
 * Starts modules in registration order and stops them in reverse. Every
 * failure is captured in health; one module cannot abort startup or shutdown
 * of the others.
 */
export class DefaultModuleRegistry implements ModuleRegistry {
  private readonly records = new Map<ModuleId, ModuleRecord>();
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly events: EventBus<AppEvents>;
  private readonly config: AppConfig;
  private readonly initTimeoutMs: number;
  private readonly shutdownTimeoutMs: number;

  private state: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' =
    'idle';
  private startPromise?: Promise<ModuleStartReport>;
  private stopPromise?: Promise<void>;
  private report?: ModuleStartReport;

  constructor(options: ModuleRegistryOptions) {
    this.logger = options.logger;
    this.clock = options.clock;
    this.events = options.events;
    this.config = options.config;
    this.initTimeoutMs = options.initTimeoutMs ?? 10_000;
    this.shutdownTimeoutMs =
      options.shutdownTimeoutMs ?? options.initTimeoutMs ?? 10_000;
  }

  register(module: AppModule): void {
    if (this.state !== 'idle') {
      throw new AppError(
        'conflict',
        'Modules must be registered before the registry starts',
      );
    }
    if (this.records.has(module.id)) {
      throw new AppError('conflict', `Module "${module.id}" is already registered`);
    }
    const record: ModuleRecord = {
      module,
      cleanups: [],
      health: { status: 'registered', updatedAt: this.clock.now() },
      attempted: false,
    };
    this.records.set(module.id, record);
    this.emitHealth(record);
  }

  start(): Promise<ModuleStartReport> {
    if (this.state === 'running' && this.report !== undefined) {
      return Promise.resolve(this.report);
    }
    if (this.state === 'starting' && this.startPromise !== undefined) {
      return this.startPromise;
    }
    if (this.state !== 'idle') {
      return Promise.reject(
        new AppError('conflict', 'The module registry cannot be restarted'),
      );
    }
    this.startPromise = this.startAll();
    return this.startPromise;
  }

  async stop(): Promise<void> {
    if (this.stopPromise !== undefined) return this.stopPromise;
    this.stopPromise = this.stopAll();
    return this.stopPromise;
  }

  health(): readonly ModuleHealthReport[] {
    return [...this.records.values()].map((record) => ({
      ...record.health,
      moduleId: record.module.id,
      optional: record.module.optional ?? false,
    }));
  }

  get<T extends AppModule = AppModule>(moduleId: ModuleId): T | undefined {
    return this.records.get(moduleId)?.module as T | undefined;
  }

  private async startAll(): Promise<ModuleStartReport> {
    this.state = 'starting';
    const startedAt = this.clock.now();
    const results: ModuleStartResult[] = [];

    for (const record of this.records.values()) {
      results.push(await this.initialize(record));
    }

    this.state = 'running';
    const report: ModuleStartReport = {
      startedAt,
      durationMs: Math.max(0, this.clock.now() - startedAt),
      modules: results,
      failed: results
        .filter((result) => result.status === 'failed')
        .map((result) => result.moduleId),
    };
    this.report = report;
    this.logger.info('Module startup complete', {
      ready: results.filter((r) => r.status === 'ready').length,
      failed: report.failed,
    });
    return report;
  }

  private async initialize(record: ModuleRecord): Promise<ModuleStartResult> {
    record.attempted = true;
    const abort = new AbortController();
    record.abort = abort;
    const context = this.createContext(record, abort.signal);
    record.context = context;
    this.setHealth(record, { status: 'starting' });

    try {
      await withTimeout(
        record.module.initialize(context),
        this.initTimeoutMs,
        () =>
          abort.abort(
            new AppError('timeout', `Module "${record.module.id}" timed out`),
          ),
      );
      if (
        record.health.status !== 'degraded' &&
        record.health.status !== 'failed'
      ) {
        this.setHealth(record, { status: 'ready' });
      }
    } catch (error) {
      abort.abort(error);
      const appError = AppError.from(error);
      this.setHealth(record, {
        status: 'failed',
        message: appError.message,
        error: appError.toInfo(),
      });
      this.logger.error(`Module "${record.module.id}" failed to initialize`, {
        error: appError.toInfo(),
      });
    }

    const health = record.health;
    return health.error === undefined
      ? { moduleId: record.module.id, status: health.status }
      : {
          moduleId: record.module.id,
          status: health.status,
          error: health.error,
        };
  }

  private async stopAll(): Promise<void> {
    if (this.state === 'starting' && this.startPromise !== undefined) {
      await this.startPromise.catch(() => undefined);
    }
    if (this.state === 'stopped') return;

    this.state = 'stopping';
    for (const record of [...this.records.values()].reverse()) {
      if (!record.attempted) {
        this.setHealth(record, { status: 'stopped' });
        continue;
      }
      await this.shutdownRecord(record);
    }
    this.state = 'stopped';
    this.logger.info('Module shutdown complete');
  }

  private async shutdownRecord(record: ModuleRecord): Promise<void> {
    const moduleId = record.module.id;
    record.abort?.abort(new AppError('cancelled', 'Application shutting down'));

    let failure: AppError | undefined;
    try {
      if (record.module.shutdown !== undefined) {
        await withTimeout(
          record.module.shutdown(),
          this.shutdownTimeoutMs,
          () => undefined,
        );
      }
    } catch (error) {
      failure = AppError.from(error);
      this.logger.error(`Module "${moduleId}" failed to shut down`, {
        error: failure.toInfo(),
      });
    }

    for (const cleanup of [...record.cleanups].reverse()) {
      try {
        await cleanup();
      } catch (error) {
        this.logger.warn(`Cleanup for module "${moduleId}" failed`, {
          error: toErrorInfo(error),
        });
      }
    }
    record.cleanups.length = 0;

    if (failure === undefined) {
      this.setHealth(record, { status: 'stopped' });
    } else {
      this.setHealth(record, {
        status: 'failed',
        message: failure.message,
        error: failure.toInfo(),
      });
    }
    record.context = undefined;
  }

  private createContext(
    record: ModuleRecord,
    signal: AbortSignal,
  ): ModuleContext {
    const moduleId = record.module.id;
    return {
      moduleId,
      config: this.config,
      logger: this.logger.child(moduleId),
      clock: this.clock,
      events: this.events,
      signal,
      report: (status: ModuleReportStatus, message?: string) => {
        if (this.state === 'stopped') {
          this.logger.warn(`Status report after shutdown ignored`, { moduleId });
          return;
        }
        this.setHealth(
          record,
          message === undefined ? { status } : { status, message },
        );
      },
      onCleanup: (cleanup: Cleanup) => {
        if (this.state === 'stopped') {
          throw new AppError(
            'conflict',
            'Cleanup handlers cannot be registered after shutdown',
          );
        }
        record.cleanups.push(cleanup);
      },
    };
  }

  private setHealth(
    record: ModuleRecord,
    patch: Omit<ModuleHealth, 'updatedAt'>,
  ): void {
    record.health = { ...patch, updatedAt: this.clock.now() };
    this.emitHealth(record);
  }

  private emitHealth(record: ModuleRecord): void {
    this.events.emit('core.module.health', {
      moduleId: record.module.id,
      health: record.health,
    });
  }
}
