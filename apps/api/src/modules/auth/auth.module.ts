import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { StaffService } from './staff.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard, PermissionsGuard } from './roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [StaffService, SupabaseAuthGuard, RolesGuard, PermissionsGuard],
  exports: [StaffService, SupabaseAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
