/**
 * Environment variables, validated once at startup. The app refuses to boot with
 * a missing or malformed value instead of failing later on first use.
 */
export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  CORS_ORIGIN: string;

  DATABASE_URL: string;
  DATABASE_SSL: boolean;
  DATABASE_SSL_CA?: string;

  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_DAYS: number;
}

const NODE_ENVS = ['development', 'test', 'production'] as const;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];

  const str = (key: string, fallback?: string): string => {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (fallback !== undefined) return fallback;
    errors.push(`${key} is required`);
    return '';
  };

  const int = (key: string, fallback: number, min: number): number => {
    const value = raw[key];
    if (value === undefined || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min) {
      errors.push(`${key} must be an integer >= ${min}`);
      return fallback;
    }
    return parsed;
  };

  const oneOf = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = str(key, fallback);
    if ((allowed as readonly string[]).includes(value)) return value as T;
    errors.push(`${key} must be one of: ${allowed.join(', ')}`);
    return fallback;
  };

  const bool = (key: string, fallback: boolean): boolean => {
    const value = raw[key];
    if (value === undefined || value === '') return fallback;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    errors.push(`${key} must be true or false`);
    return fallback;
  };

  const nodeEnv = oneOf('NODE_ENV', NODE_ENVS, 'development');

  const databaseUrl = str('DATABASE_URL');
  if (databaseUrl && !/^(mysql|mariadb):\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL must start with mysql:// or mariadb://');
  }

  const jwtSecret = str('JWT_ACCESS_SECRET');
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters');
  }

  const sslCa = raw['DATABASE_SSL_CA'];

  const env: Env = {
    NODE_ENV: nodeEnv,
    PORT: int('PORT', 3000, 1),
    LOG_LEVEL: oneOf('LOG_LEVEL', LOG_LEVELS, nodeEnv === 'production' ? 'info' : 'debug'),
    CORS_ORIGIN: str('CORS_ORIGIN', 'http://localhost:5173'),
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: bool('DATABASE_SSL', false),
    ...(typeof sslCa === 'string' && sslCa !== '' ? { DATABASE_SSL_CA: sslCa } : {}),
    JWT_ACCESS_SECRET: jwtSecret,
    JWT_ACCESS_TTL_SECONDS: int('JWT_ACCESS_TTL_SECONDS', 900, 60),
    REFRESH_TOKEN_TTL_DAYS: int('REFRESH_TOKEN_TTL_DAYS', 7, 1),
  };

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }
  return env;
}
