import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}
  async search(checkIn: string, checkOut: string, guests: number) {
    const start = date(checkIn); const end = date(checkOut);
    if (end <= start || !Number.isInteger(guests) || guests < 1) throw new BadRequestException({ code: 'INVALID_AVAILABILITY_QUERY', message: 'Availability input is invalid' });
    const availableRoom = { status: 'ACTIVE', deletedAt: null, blocks: { none: { cancelledAt: null, startDate: { lt: end }, endDate: { gt: start } } }, occupancies: { none: { stayDate: { gte: start, lt: end } } } } as const;
    return this.prisma.roomType.findMany({ where: { deletedAt: null, status: 'ACTIVE', maxTotalGuests: { gte: guests }, rooms: { some: availableRoom } }, include: { rooms: { where: availableRoom, select: { id: true } } }, orderBy: { sortOrder: 'asc' } });
  }
}
function date(value: string): Date { const result = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(result.getTime())) throw new BadRequestException({ code: 'INVALID_AVAILABILITY_QUERY', message: 'Availability input is invalid' }); return result; }
