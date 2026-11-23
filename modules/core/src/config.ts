import type {
  AppConfig,
  ConfigIssue,
  LoadConfigOptions,
  LoadConfigResult,
  RuntimeEnvironment,
} from '#contracts/config.ts';
import type { LogLevel } from '#contracts/logging.ts';

const DEFAULT_CONFIG: AppConfig = {
  appName: 'P2P LAN Messenger',
  appVersion: '0.1.0',
  environment: 'production',
  logLevel: 'info',
  dataDir: '.lan-messenger',
};

const ENVIRONMENTS: readonly RuntimeEnvironment[] = [
  'development',
  'test',
  'production',
];
const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

function runtimeEnv(): Readonly<Record<string, string | undefined>> {
  const scope = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return scope.process?.env ?? {};
}

function read(
  env: Readonly<Record<string, string | undefined>>,
  key: string,
): string | undefined {
  const raw = env[key];
  if (raw === undefined) return undefined;
  const value = raw.trim();
  return value.length === 0 ? undefined : value;
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
): value is T {
  return (allowed as readonly string[]).includes(value);
}

/**
 * Reads `APP_ENV`, `APP_LOG_LEVEL`, `APP_DATA_DIR`, `APP_NAME` and
 * `APP_VERSION`. Invalid values keep the default and are reported as issues
 * so startup can continue and the problem stays visible.
 */
export function loadConfig(options: LoadConfigOptions = {}): LoadConfigResult {
  const env = options.env ?? runtimeEnv();
  const defaults: AppConfig = { ...DEFAULT_CONFIG, ...options.defaults };
  const issues: ConfigIssue[] = [];

  let environment = defaults.environment;
  const rawEnvironment = read(env, 'APP_ENV');
  if (rawEnvironment !== undefined) {
    if (oneOf(rawEnvironment, ENVIRONMENTS)) environment = rawEnvironment;
    else {
      issues.push({
        key: 'environment',
        message: `Invalid APP_ENV "${rawEnvironment}"; expected ${ENVIRONMENTS.join(', ')}`,
      });
    }
  }

  let logLevel = defaults.logLevel;
  const rawLogLevel = read(env, 'APP_LOG_LEVEL');
  if (rawLogLevel !== undefined) {
    if (oneOf(rawLogLevel, LOG_LEVELS)) logLevel = rawLogLevel;
    else {
      issues.push({
        key: 'logLevel',
        message: `Invalid APP_LOG_LEVEL "${rawLogLevel}"; expected ${LOG_LEVELS.join(', ')}`,
      });
    }
  }

  const appName = read(env, 'APP_NAME') ?? defaults.appName;
  if (appName.trim().length === 0) {
    issues.push({ key: 'appName', message: 'appName must not be empty' });
  }

  const appVersion = read(env, 'APP_VERSION') ?? defaults.appVersion;
  if (appVersion.trim().length === 0) {
    issues.push({ key: 'appVersion', message: 'appVersion must not be empty' });
  }

  const dataDir = read(env, 'APP_DATA_DIR') ?? defaults.dataDir;
  if (dataDir.trim().length === 0) {
    issues.push({ key: 'dataDir', message: 'dataDir must not be empty' });
  }

  return {
    config: {
      appName,
      appVersion,
      environment,
      logLevel,
      dataDir,
    },
    issues,
  };
}
