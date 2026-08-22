import { OpsCalendarService } from './ops-calendar.service';

function prismaMock() {
  return {
    room: { findMany: jest.fn().mockResolvedValue([]) },
    booking: { findMany: jest.fn().mockResolvedValue([]) },
    roomBlock: { findMany: jest.fn().mockResolvedValue([]) },
    bbqReservation: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : arg)),
  };
}

const FROM = new Date('2026-09-01T00:00:00.000Z');
const TO = new Date('2026-09-08T00:00:00.000Z');

describe('OpsCalendarService.range', () => {
  it('flattens booking room assignments to a plain id list', async () => {
    const prisma = prismaMock();
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        bookingCode: 'VMD-1',
        status: 'CANCELLED',
        checkInDate: new Date('2026-09-02'),
        checkOutDate: new Date('2026-09-04'),
        customer: { fullName: 'Nguyễn Văn A' },
        rooms: [{ roomId: 'room-1' }, { roomId: 'room-2' }],
      },
    ]);
    const service = new OpsCalendarService(prisma as never);

    const result = await service.range({ from: FROM, to: TO });

    expect(result.bookings).toEqual([
      {
        id: 'booking-1',
        bookingCode: 'VMD-1',
        status: 'CANCELLED',
        checkInDate: new Date('2026-09-02'),
        checkOutDate: new Date('2026-09-04'),
        customerName: 'Nguyễn Văn A',
        roomIds: ['room-1', 'room-2'],
      },
    ]);
  });

  it('does not filter bookings by status, so cancelled stays remain visible on the calendar', async () => {
    const prisma = prismaMock();
    const service = new OpsCalendarService(prisma as never);

    await service.range({ from: FROM, to: TO });

    const where = prisma.booking.findMany.mock.calls[0][0].where;
    expect(where.status).toBeUndefined();
    expect(where.checkInDate).toEqual({ lt: TO });
    expect(where.checkOutDate).toEqual({ gt: FROM });
  });

  it('excludes cancelled room blocks and flattens BBQ table assignments', async () => {
    const prisma = prismaMock();
    prisma.bbqReservation.findMany.mockResolvedValue([
      {
        id: 'bbq-1',
        reservationCode: 'BBQ-1',
        status: 'CONFIRMED',
        reservationDate: new Date('2026-09-03'),
        startTime: '18:00',
        endTime: '20:00',
        tables: [{ tableId: 'table-1', areaId: 'area-1' }],
      },
    ]);
    const service = new OpsCalendarService(prisma as never);

    const result = await service.range({ from: FROM, to: TO });

    expect(prisma.roomBlock.findMany.mock.calls[0][0].where.cancelledAt).toBeNull();
    expect(result.bbqReservations).toEqual([
      {
        id: 'bbq-1',
        reservationCode: 'BBQ-1',
        status: 'CONFIRMED',
        reservationDate: new Date('2026-09-03'),
        startTime: '18:00',
        endTime: '20:00',
        tableIds: ['table-1'],
      },
    ]);
  });

  it('scopes every query to a single room when roomId is given', async () => {
    const prisma = prismaMock();
    const service = new OpsCalendarService(prisma as never);

    await service.range({ from: FROM, to: TO, roomId: 'room-1' });

    expect(prisma.room.findMany.mock.calls[0][0].where.id).toBe('room-1');
    expect(prisma.booking.findMany.mock.calls[0][0].where.rooms).toEqual({
      some: { roomId: 'room-1' },
    });
    expect(prisma.roomBlock.findMany.mock.calls[0][0].where.roomId).toBe('room-1');
  });
});
