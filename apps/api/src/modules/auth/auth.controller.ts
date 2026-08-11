import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../../common/interceptors/correlation-id.interceptor';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { MeResponseDto } from './dto/me-response.dto';
import type { AuthenticatedActor, AuthSessionResponse } from './auth.types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in a staff member with Supabase email/password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Authenticated staff session' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive staff profile' })
  async login(@Body() dto: LoginDto, @Req() request: Request): Promise<AuthSessionResponse> {
    return this.authService.login(dto.email, dto.password, correlationId(request));
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a Supabase staff session refresh token' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Rotated staff session' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token or inactive staff profile' })
  async refresh(@Body() dto: RefreshDto, @Req() request: Request): Promise<AuthSessionResponse> {
    return this.authService.refresh(dto.refreshToken, correlationId(request));
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current Supabase staff session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async logout(@Req() request: Request): Promise<{ revoked: true }> {
    return this.authService.logout(getAuthorization(request), correlationId(request));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the trusted staff actor for the current access token' })
  @ApiOkResponse({ description: 'Authenticated staff actor with trusted database roles and permissions', type: MeResponseDto })
  @ApiResponse({ status: 401, description: 'Missing, invalid, inactive, or unknown staff identity' })
  async me(@Req() request: Request): Promise<{ actor: AuthenticatedActor }> {
    return { actor: await this.authService.getActorForRequest(request, correlationId(request)) };
  }
}

function correlationId(request: Request): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getAuthorization(request: Request): string | undefined {
  const value = request.headers.authorization;
  return Array.isArray(value) ? value[0] : value;
}
