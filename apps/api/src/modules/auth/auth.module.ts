import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service';
import { PermissionsGuard } from './permissions.guard';
import { RolesService } from './roles.service';

@Module({
  controllers: [AuthController],
  providers: [AuthConfigService, AuthService, SupabaseJwtVerifier, PermissionsGuard, RolesService],
  exports: [AuthService, PermissionsGuard, RolesService],
})
export class AuthModule {}
