import { BadRequestException } from '@nestjs/common';
import { PublicBookingsService } from './public-bookings.service';

const valid = { roomSlug: 'pine-cabin', checkIn: '2026-09-10', checkOut: '2026-09-12', fullName: 'Nguyen Van A', phone: '0901234567', adults: 2, children: 0 };

describe('PublicBookingsService', () => {
  it('rejects a phone outside the Vietnamese E.164 mobile policy before a database operation', async () => {
    const service = new PublicBookingsService({ $transaction: jest.fn() } as never, {} as never, {} as never);
    await expect(service.create({ ...valid, phone: '+12025550123' }, 'checkout-key', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replays only the safe stored response for an idempotent checkout', async () => {
    const safeResponse = { bookingCode: 'SYN-12345678', status: 'PENDING_PAYMENT', paymentReference: 'opaque-payment-id' };
    const transaction = { idempotencyKey: { findUnique: jest.fn().mockResolvedValue({ responseBody: safeResponse }) } };
    const prisma = { $transaction: jest.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)) };
    const service = new PublicBookingsService(prisma as never, {} as never, {} as never);
    await expect(service.create(valid, 'checkout-key', {})).resolves.toEqual(safeResponse);
    expect(transaction.idempotencyKey.findUnique).toHaveBeenCalledWith({ where: { key: 'checkout-key' } });
  });
});
