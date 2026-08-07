import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
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
  @ApiOperation({ summary: 'Dependency status (protected intent)' })
  dependencies(): { status: string; dependencies: Record<string, unknown> } {
    return {
      status: 'ok',
      dependencies: {
        database: 'not_configured',
        redis: 'not_configured',
      },
    };
  }
}
