import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateResourceHold { resourceType: string; resourceId: string; referenceType: string; referenceId: string; startAt: Date; endAt: Date; idempotencyKey: string; }

@Injectable()
export class ResourceHoldsService {
  constructor(private readonly prisma: PrismaService, private readonly now: () => Date = () => new Date(), private readonly holdMinutes = configuredHoldMinutes()) {}
  async create(input: CreateResourceHold) {
    if (input.endAt <= input.startAt || !input.idempotencyKey.trim()) throw invalidHold();
    const existing = await this.prisma.resourceHold.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    const createdAt = this.now(); const expiresAt = new Date(createdAt.getTime() + this.holdMinutes * 60_000);
    return this.prisma.resourceHold.create({ data: { ...input, idempotencyKey: input.idempotencyKey.trim(), createdAt, expiresAt, status: 'ACTIVE' } });
  }
  async expireDue(now = this.now()) {
    return this.prisma.resourceHold.updateMany({ where: { status: 'ACTIVE', expiresAt: { lte: now } }, data: { status: 'EXPIRED', releasedAt: now } });
  }
}
function configuredHoldMinutes(): number { const parsed = Number.parseInt(process.env['BOOKING_HOLD_MINUTES'] ?? '30', 10); return Number.isInteger(parsed) && parsed > 0 && parsed <= 360 ? parsed : 30; }
function invalidHold(): BadRequestException { return new BadRequestException({ code: 'INVALID_RESOURCE_HOLD', message: 'Resource hold input is invalid' }); }
