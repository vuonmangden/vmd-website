import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from './auth.types';
import { AdminAuthGuard } from './admin-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { AssignRoleDto, ChangeStaffStatusDto, InviteStaffDto } from './dto/staff-management.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { StaffManagementService } from './staff-management.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { RolesService } from './roles.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Staff management')
@ApiBearerAuth()
@Controller('admin/staff')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('user.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks user.manage or the Super Admin role' })
export class StaffManagementController {
  constructor(
    private readonly staff: StaffManagementService,
    private readonly roles: RolesService,
  ) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite a new staff member via the Supabase Admin API and assign a starting role' })
  async invite(
    @Body() dto: InviteStaffDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ id: string; email: string; fullName: string; status: string }> {
    const profile = await this.staff.invite(
      request.actor!,
      { email: dto.email, fullName: dto.fullName },
      correlationId(request),
    );
    await this.roles.assignRole(request.actor!, profile.id, dto.roleCode, correlationId(request));
    return profile;
  }

  @Get()
  @ApiOperation({ summary: 'List staff with their assigned roles' })
  list(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.staff.list(request.actor!, {
      status: status?.trim() || undefined,
      page: bounded(page, 1, 1, 1_000_000),
      pageSize: bounded(pageSize, 50, 1, 100),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one staff profile with role assignment history' })
  detail(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.staff.detail(request.actor!, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or suspend a staff member' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStaffStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.staff.changeStatus(
      request.actor!,
      id,
      dto.status,
      dto.reason,
      correlationId(request),
    );
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign a system role' })
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ assigned: true }> {
    await this.roles.assignRole(request.actor!, id, dto.roleCode, correlationId(request));
    return { assigned: true };
  }

  @Delete(':id/roles/:roleCode')
  @ApiOperation({ summary: 'Revoke a system role' })
  async revokeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleCode') roleCode: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ revoked: true }> {
    await this.roles.revokeRole(request.actor!, id, roleCode, correlationId(request));
    return { revoked: true };
  }
}

function correlationId(request: AuthenticatedRequest): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function bounded(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}
