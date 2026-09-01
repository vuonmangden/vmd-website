import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { BbqAvailabilitySearchDto } from './dto/bbq-availability-search.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs the runtime class for DI metadata.
import { BbqAvailabilityService } from './bbq-availability.service';

@ApiTags('BBQ availability')
@Controller('public/bbq/availability')
export class PublicBbqAvailabilityController {
  constructor(private readonly availability: BbqAvailabilityService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search BBQ areas/tables with capacity for a date and time window' })
  search(@Body() dto: BbqAvailabilitySearchDto) {
    return this.availability.search(dto);
  }
}
