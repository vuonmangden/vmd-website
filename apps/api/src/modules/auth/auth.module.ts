import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service';

@Module({
  controllers: [AuthController],
  providers: [AuthConfigService, AuthService, SupabaseJwtVerifier],
})
export class AuthModule {}
