import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PriceEngineService } from './price-engine.service';

@Injectable()
export class RoomPricingService {
  constructor(private readonly prisma: PrismaService, private readonly engine: PriceEngineService) {}
  async quote(roomTypeId: string, dateFrom: string, dateTo: string, adults: number, children: number) {
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, status: 'ACTIVE', deletedAt: null },
      select: { standardAdults: true, maxAdults: true, maxChildren: true, maxTotalGuests: true },
    });
    if (!roomType || adults > roomType.maxAdults || children > roomType.maxChildren || adults + children > roomType.maxTotalGuests) {
      throw new BadRequestException({ code: 'INVALID_ROOM_CAPACITY', message: 'Guest count exceeds room capacity' });
    }
    const rules = await this.prisma.roomRateRule.findMany({ where: { roomTypeId, status: 'ACTIVE', roomType: { deletedAt: null } }, orderBy: [{ priority: 'desc' }, { id: 'asc' }] });
    return this.engine.quote(rules, dateFrom, dateTo, adults, children, roomType.standardAdults);
  }
}
