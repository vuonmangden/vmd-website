import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RedisHealthService } from './redis-health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisHealth: RedisHealthService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  ready(): { status: string } {
    return { status: 'ok' };
  }

  @Get('dependencies')
  @ApiOperation({ summary: 'Dependency health check' })
  async dependencies(): Promise<{
    status: string;
    dependencies: Record<string, unknown>;
  }> {
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      dbStatus = 'unhealthy';
    }

    const redisStatus = (await this.redisHealth.isHealthy()) ? 'healthy' : 'unhealthy';

    return {
      status: dbStatus === 'healthy' && redisStatus === 'healthy' ? 'ok' : 'degraded',
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }
}
