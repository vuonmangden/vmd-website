import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service';
import { PermissionsGuard } from './permissions.guard';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAccessController } from './admin-access.controller';
import { RolesService } from './roles.service';
import { LoginRateLimitService } from './login-rate-limit.service';
import { SecurityConfigService } from '../../common/security/security.config';
import { StaffManagementController } from './staff-management.controller';
import { StaffManagementService } from './staff-management.service';
import { SupabaseAdminService } from './supabase-admin.service';

@Module({
  controllers: [AuthController, AdminAccessController, StaffManagementController],
  providers: [AuthConfigService, AuthService, SupabaseJwtVerifier, AdminAuthGuard, PermissionsGuard, RolesService, LoginRateLimitService, SecurityConfigService, StaffManagementService, SupabaseAdminService],
  exports: [AuthService, AdminAuthGuard, PermissionsGuard, RolesService, StaffManagementService],
})
export class AuthModule {}
