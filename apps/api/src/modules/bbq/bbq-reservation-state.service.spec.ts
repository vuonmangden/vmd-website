import { BbqReservationStateService } from './bbq-reservation-state.service';

const reservationId = '00000000-0000-4000-8000-000000000010';

function transaction(status: string) {
  const tx = {
    bbqReservation: {
      findUnique: jest.fn().mockResolvedValue({ id: reservationId, status }),
      update: jest.fn().mockResolvedValue({ id: reservationId, status: 'CANCELLED' }),
    },
    bbqReservationStatusHistory: { create: jest.fn() },
    bbqReservationTable: { updateMany: jest.fn() },
    resourceHold: { updateMany: jest.fn() },
  };
  return { tx, prisma: { $transaction: (op: (t: typeof tx) => unknown) => op(tx) } };
}

describe('BbqReservationStateService', () => {
  it('cancels a reservation with history and releases table/hold atomically', async () => {
    const { tx, prisma } = transaction('PENDING_PAYMENT');
    const service = new BbqReservationStateService(prisma as never);

    await service.transition(reservationId, 'CANCELLED', 'khách hủy');

    expect(tx.bbqReservationStatusHistory.create).toHaveBeenCalledWith({
      data: { reservationId, fromStatus: 'PENDING_PAYMENT', toStatus: 'CANCELLED', reason: 'khách hủy' },
    });
    expect(tx.bbqReservationTable.updateMany).toHaveBeenCalledWith({
      where: { reservationId, status: 'ACTIVE' },
      data: { status: 'RELEASED' },
    });
    expect(tx.resourceHold.updateMany).toHaveBeenCalled();
  });

  it('confirms a pending reservation without releasing the hold', async () => {
    const { tx, prisma } = transaction('PENDING_PAYMENT');
    tx.bbqReservation.update.mockResolvedValue({ id: reservationId, status: 'CONFIRMED' });
    const service = new BbqReservationStateService(prisma as never);

    await service.transition(reservationId, 'CONFIRMED');

    expect(tx.resourceHold.updateMany).not.toHaveBeenCalled();
    expect(tx.bbqReservationTable.updateMany).not.toHaveBeenCalled();
  });

  it('checks a confirmed reservation in without releasing the hold', async () => {
    const { tx, prisma } = transaction('CONFIRMED');
    tx.bbqReservation.update.mockResolvedValue({ id: reservationId, status: 'CHECKED_IN' });
    const service = new BbqReservationStateService(prisma as never);

    await service.transition(reservationId, 'CHECKED_IN');

    expect(tx.bbqReservationStatusHistory.create).toHaveBeenCalledWith({
      data: { reservationId, fromStatus: 'CONFIRMED', toStatus: 'CHECKED_IN', reason: null },
    });
    expect(tx.resourceHold.updateMany).not.toHaveBeenCalled();
    expect(tx.bbqReservationTable.updateMany).not.toHaveBeenCalled();
  });

  it('checks a checked-in reservation out without releasing the hold', async () => {
    const { tx, prisma } = transaction('CHECKED_IN');
    tx.bbqReservation.update.mockResolvedValue({ id: reservationId, status: 'CHECKED_OUT' });
    const service = new BbqReservationStateService(prisma as never);

    await service.transition(reservationId, 'CHECKED_OUT');

    expect(tx.resourceHold.updateMany).not.toHaveBeenCalled();
  });

  it('rejects checking in a reservation that is not yet confirmed', async () => {
    const { prisma } = transaction('PENDING_PAYMENT');
    const service = new BbqReservationStateService(prisma as never);

    await expect(service.transition(reservationId, 'CHECKED_IN')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_BBQ_RESERVATION_TRANSITION' }),
    });
  });

  it('rejects an invalid transition', async () => {
    const { prisma } = transaction('CANCELLED');
    const service = new BbqReservationStateService(prisma as never);

    await expect(service.transition(reservationId, 'CONFIRMED')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_BBQ_RESERVATION_TRANSITION' }),
    });
  });

  it('throws NotFoundException for an unknown reservation', async () => {
    const tx = {
      bbqReservation: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
      bbqReservationStatusHistory: { create: jest.fn() },
      bbqReservationTable: { updateMany: jest.fn() },
      resourceHold: { updateMany: jest.fn() },
    };
    const prisma = { $transaction: (op: (t: typeof tx) => unknown) => op(tx) };
    const service = new BbqReservationStateService(prisma as never);

    await expect(service.transition(reservationId, 'CONFIRMED')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'BBQ_RESERVATION_NOT_FOUND' }),
    });
  });
});
