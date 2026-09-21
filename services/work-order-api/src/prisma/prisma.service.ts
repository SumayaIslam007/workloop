import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import type { Env } from '../config/env';
import { mariaDbPoolConfig } from './mariadb-pool-config';

/**
 * Connects lazily on the first query, so the API (and Swagger) can start even when
 * the database is unreachable. `/health/ready` reports the real connection state.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    const sslCa = config.get('DATABASE_SSL_CA', { infer: true });
    const adapter = new PrismaMariaDb(
      mariaDbPoolConfig(config.get('DATABASE_URL', { infer: true }), {
        ssl: config.get('DATABASE_SSL', { infer: true }),
        ...(sslCa ? { sslCa } : {}),
      }),
    );
    super({ adapter });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
