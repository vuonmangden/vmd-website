import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { BbqAreaService } from './bbq-area.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- ValidationPipe reads these classes from decorator metadata at runtime.
import {
  CreateBbqAreaDto,
  CreateBbqServiceSlotDto,
  CreateBbqTableDto,
  UpdateBbqAreaDto,
  UpdateBbqServiceSlotDto,
  UpdateBbqTableDto,
} from './dto/bbq-area.dto';

// ── Public ───────────────────────────────────────────────────

@ApiTags('BBQ areas')
@Controller('public/bbq/areas')
export class PublicBbqAreaController {
  constructor(private readonly areas: BbqAreaService) {}

  @Get()
  @ApiOperation({ summary: 'Available BBQ areas with tables and service slots' })
  list() {
    return this.areas.publicListAreas();
  }
}

// ── Admin Areas ──────────────────────────────────────────────

@ApiTags('BBQ areas')
@ApiBearerAuth()
@Controller('admin/bbq/areas')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('bbq.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks bbq.manage' })
export class AdminBbqAreaController {
  constructor(private readonly areas: BbqAreaService) {}

  @Get()
  @ApiOperation({ summary: 'List all BBQ areas including inactive' })
  list() {
    return this.areas.listAreas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a BBQ area with its tables' })
  get(@Param('id') id: string) {
    return this.areas.findAreaById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a BBQ area' })
  create(@Body() dto: CreateBbqAreaDto) {
    return this.areas.createArea(dto);
  }

  @Post(':id/update')
  @ApiOperation({ summary: 'Update a BBQ area' })
  update(@Param('id') id: string, @Body() dto: UpdateBbqAreaDto) {
    return this.areas.updateArea(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a BBQ area' })
  archive(@Param('id') id: string) {
    return this.areas.archiveArea(id);
  }
}

// ── Admin Tables ─────────────────────────────────────────────

@ApiTags('BBQ tables')
@ApiBearerAuth()
@Controller('admin/bbq/tables')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('bbq.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks bbq.manage' })
export class AdminBbqTableController {
  constructor(private readonly areas: BbqAreaService) {}

  @Get()
  @ApiOperation({ summary: 'List all BBQ tables' })
  @ApiQuery({ name: 'areaId', required: false })
  list(@Query('areaId') areaId?: string) {
    return this.areas.listTables(areaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a BBQ table by ID' })
  get(@Param('id') id: string) {
    return this.areas.findTableById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a BBQ table in an area' })
  create(@Body() dto: CreateBbqTableDto) {
    return this.areas.createTable(dto);
  }

  @Post(':id/update')
  @ApiOperation({ summary: 'Update a BBQ table' })
  update(@Param('id') id: string, @Body() dto: UpdateBbqTableDto) {
    return this.areas.updateTable(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a BBQ table' })
  archive(@Param('id') id: string) {
    return this.areas.archiveTable(id);
  }
}

// ── Admin Service Slots ──────────────────────────────────────

@ApiTags('BBQ service slots')
@ApiBearerAuth()
@Controller('admin/bbq/service-slots')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermissions('bbq.manage')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, expired, or revoked staff session' })
@ApiForbiddenResponse({ description: 'Authenticated staff lacks bbq.manage' })
export class AdminBbqServiceSlotController {
  constructor(private readonly areas: BbqAreaService) {}

  @Get()
  @ApiOperation({ summary: 'List all BBQ service slots' })
  list() {
    return this.areas.listSlots();
  }

  @Post()
  @ApiOperation({ summary: 'Create a BBQ service slot' })
  create(@Body() dto: CreateBbqServiceSlotDto) {
    return this.areas.createSlot(dto);
  }

  @Post(':id/update')
  @ApiOperation({ summary: 'Update a BBQ service slot' })
  update(@Param('id') id: string, @Body() dto: UpdateBbqServiceSlotDto) {
    return this.areas.updateSlot(id, dto);
  }
}
