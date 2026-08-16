import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { CurrentUser } from './current-user.decorator';

interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current staff profile' })
  getMe(@CurrentUser() staff: StaffMember) {
    return {
      id: staff.id,
      email: staff.email,
      fullName: staff.fullName,
      role: staff.role,
    };
  }
}
