import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service';
import { PermissionsGuard } from './permissions.guard';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAccessController } from './admin-access.controller';
import { RolesService } from './roles.service';

@Module({
  controllers: [AuthController, AdminAccessController],
  providers: [AuthConfigService, AuthService, SupabaseJwtVerifier, AdminAuthGuard, PermissionsGuard, RolesService],
  exports: [AuthService, AdminAuthGuard, PermissionsGuard, RolesService],
})
export class AuthModule {}
