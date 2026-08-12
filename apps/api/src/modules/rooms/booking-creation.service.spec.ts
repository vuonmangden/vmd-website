import { BookingCreationService } from './booking-creation.service';

describe('BookingCreationService', () => {
  const input = { customerId: '00000000-0000-4000-8000-000000000001', roomId: '00000000-0000-4000-8000-000000000004', roomTypeId: '00000000-0000-4000-8000-000000000003', checkIn: '2099-02-01', checkOut: '2099-02-03', adults: 1, children: 0, totalAmount: 2000000n, nightlyRateSnapshot: [], idempotencyKey: 'sandbox-booking-key' };
  it('creates booking, snapshot, occupancy, hold and outbox in one transaction', async () => {
    const tx = { idempotencyKey: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() }, booking: { create: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000011', bookingCode: 'SYN-CODE', status: 'PENDING_PAYMENT', checkOutDate: new Date('2099-02-03T00:00:00.000Z') }) }, bookingRoom: { create: jest.fn() }, roomOccupancy: { createMany: jest.fn() }, resourceHold: { create: jest.fn() }, outboxEvent: { create: jest.fn() } }; const transaction = jest.fn((operation) => operation(tx));
    const service = new BookingCreationService({ $transaction: transaction } as never);
    await expect(service.create(input)).resolves.toEqual({ bookingId: '00000000-0000-4000-8000-000000000011', bookingCode: 'SYN-CODE', status: 'PENDING_PAYMENT' });
    expect(tx.roomOccupancy.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ status: 'HOLD' }), expect.objectContaining({ status: 'HOLD' })]) }); expect(tx.resourceHold.create).toHaveBeenCalled(); expect(tx.outboxEvent.create).toHaveBeenCalled();
  });
  it('returns prior idempotent response without new booking', async () => { const response={bookingId:'prior'}; const tx={idempotencyKey:{findUnique:jest.fn().mockResolvedValue({responseBody:response})}}; const service=new BookingCreationService({$transaction:(op: (transaction: typeof tx) => unknown)=>op(tx)} as never); await expect(service.create(input)).resolves.toEqual(response); });
});
