import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import type { AuthenticatedActor, AuthenticatedRequest } from '../auth/auth.types';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- ValidationPipe reads this class from decorator metadata at runtime.
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { ContactService } from './contact.service';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@ApiTags('Contact')
@ApiBearerAuth()
@Controller('admin/contact-submissions')
@UseGuards(AdminAuthGuard)
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks access to contact submissions' })
export class AdminContactController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'List contact submissions with masked contact details' })
  list(
    @Req() request: Request,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contact.list(actorOf(request), {
      status: status?.trim() || undefined,
      page: bounded(page, 1, 1, 1_000_000),
      pageSize: bounded(pageSize, 50, 1, 100),
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Triage a contact submission' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactStatusDto,
    @Req() request: Request,
  ) {
    return this.contact.updateStatus(
      actorOf(request),
      id,
      dto.status,
      dto.internalNote,
      correlationId(request),
    );
  }
}

function actorOf(request: Request): AuthenticatedActor {
  const actor = (request as AuthenticatedRequest).actor;
  if (!actor) throw new Error('Authenticated actor is missing from request');
  return actor;
}

function correlationId(request: Request): string {
  const value = request.headers[CORRELATION_ID_HEADER];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function bounded(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}
