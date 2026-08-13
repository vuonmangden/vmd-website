import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { AuditService } from './audit.service';

@ApiTags('Audit logs') @ApiBearerAuth() @Controller('admin/audit-logs') @UseGuards(AdminAuthGuard, PermissionsGuard) @RequirePermissions('audit.read')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks audit.read' })
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get() @ApiOperation({ summary: 'List immutable audit records' })
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('action') action?: string, @Query('resourceType') resourceType?: string, @Req() request?: Request) {
    void request;
    return this.audit.list({ page: bounded(page, 1, 1, 1_000_000), pageSize: bounded(pageSize, 50, 1, 100), action: action?.trim() || undefined, resourceType: resourceType?.trim() || undefined });
  }
}
function bounded(value: string | undefined, fallback: number, minimum: number, maximum: number): number { const parsed = Number.parseInt(value ?? '', 10); return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback; }
