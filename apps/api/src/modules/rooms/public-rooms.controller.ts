import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DTO metadata for validation.
import { PublicRoomAvailabilityDto, PublicRoomQuoteDto } from './dto/public-room-search.dto';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PublicRoomsService } from './public-rooms.service';

@ApiTags('Public rooms')
@Controller('public/rooms')
export class PublicRoomsController {
  constructor(private readonly rooms: PublicRoomsService) {}

  @Get() @ApiOperation({ summary: 'List active production room types with safe public fields' })
  list() { return this.rooms.list(); }

  @Get(':slug') @ApiOperation({ summary: 'Get one active production room type by public slug' })
  findBySlug(@Param('slug') slug: string) { return this.rooms.findBySlug(slug); }

  @Post('availability/search') @ApiOperation({ summary: 'Search active room types without exposing physical inventory' })
  availability(@Body() dto: PublicRoomAvailabilityDto) { return this.rooms.availability(dto.checkIn, dto.checkOut, dto.guests); }

  @Post('quotes') @ApiOperation({ summary: 'Return a production rate quote for an active public room slug' })
  quote(@Body() dto: PublicRoomQuoteDto) { return this.rooms.quote(dto.slug, dto.dateFrom, dto.dateTo, dto.adults, dto.children); }
}
