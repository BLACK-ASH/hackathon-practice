import type { LogLevel } from './logging.ts';

export type RuntimeEnvironment = 'development' | 'test' | 'production';

export interface AppConfig {
  readonly appName: string;
  readonly appVersion: string;
  readonly environment: RuntimeEnvironment;
  readonly logLevel: LogLevel;
  readonly dataDir: string;
}

export interface ConfigIssue {
  readonly key: string;
  readonly message: string;
}

export interface LoadConfigOptions {
  /** Defaults to `process.env` when available, otherwise an empty map. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly defaults?: Partial<AppConfig>;
}

export interface LoadConfigResult {
  readonly config: AppConfig;
  /** Invalid values fall back to defaults and are listed here. */
  readonly issues: readonly ConfigIssue[];
}
