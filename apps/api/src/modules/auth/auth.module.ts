import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { StaffService } from './staff.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [StaffService, SupabaseAuthGuard],
  exports: [StaffService, SupabaseAuthGuard],
})
export class AuthModule {}
