import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'mariadb';

export interface DatabaseSslOptions {
  ssl: boolean;
  /** Path to a CA certificate, for providers that use their own certificate authority. */
  sslCa?: string;
}

/**
 * Converts the `mysql://` URL used by the Prisma CLI into the pool config the
 * MariaDB driver adapter needs at runtime, so there is a single source of truth.
 */
export function mariaDbPoolConfig(databaseUrl: string, options: DatabaseSslOptions): PoolConfig {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
    throw new Error('DATABASE_URL must use the mysql:// or mariadb:// scheme');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) {
    throw new Error('DATABASE_URL must include a database name');
  }

  const config: PoolConfig = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
  };

  if (options.ssl) {
    config.ssl = options.sslCa
      ? { ca: readFileSync(options.sslCa, 'utf8'), rejectUnauthorized: true }
      : { rejectUnauthorized: true };
  }

  return config;
}
