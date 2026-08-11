import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from './admin-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';

@ApiTags('Admin access')
@ApiBearerAuth()
@Controller('admin/access')
@UseGuards(AdminAuthGuard, PermissionsGuard)
export class AdminAccessController {
  @Get()
  @RequirePermissions('report.read')
  @ApiOperation({ summary: 'Verify access to the protected admin shell' })
  @ApiOkResponse({ description: 'Authenticated actor has report.read' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked session' })
  @ApiForbiddenResponse({ description: 'Authenticated actor lacks report.read' })
  verify(): { allowed: true } {
    return { allowed: true };
  }

  @Get('users')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Verify access to user-management routes' })
  @ApiOkResponse({ description: 'Authenticated actor has user.manage' })
  @ApiForbiddenResponse({ description: 'Authenticated actor lacks user.manage' })
  verifyUserManagement(): { allowed: true } {
    return { allowed: true };
  }
}
