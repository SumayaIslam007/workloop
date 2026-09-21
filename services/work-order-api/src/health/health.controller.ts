import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

const DB_CHECK_TIMEOUT_MS = 2000;

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is running. Never checks dependencies, so a slow database can't get the pod restarted. */
  @Get('live')
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: the service can handle traffic, i.e. the database is reachable. */
  @Get('ready')
  @ApiOkResponse({ schema: { example: { status: 'ok', checks: { database: 'up' } } } })
  @ApiServiceUnavailableResponse({ description: 'A dependency is down' })
  async ready(): Promise<{ status: 'ok'; checks: { database: 'up' } }> {
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, DB_CHECK_TIMEOUT_MS);
      return { status: 'ok', checks: { database: 'up' } };
    } catch {
      throw new ServiceUnavailableException('Database is not reachable');
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
