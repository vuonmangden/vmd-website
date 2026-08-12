import { BookingStateService } from './booking-state.service';

describe('BookingStateService', () => {
  const bookingId = '00000000-0000-4000-8000-000000000011';
  const transaction = (status: string) => { const tx={booking:{findUnique:jest.fn().mockResolvedValue({id:bookingId,status}),update:jest.fn().mockResolvedValue({id:bookingId,status:'EXPIRED'})},bookingStatusHistory:{create:jest.fn()},roomOccupancy:{deleteMany:jest.fn()},resourceHold:{updateMany:jest.fn()}}; return {tx, prisma:{$transaction:(operation:(value:typeof tx)=>unknown)=>operation(tx)}}; };
  it('expires booking with history and releases occupancy/hold atomically', async () => { const {tx,prisma}=transaction('PENDING_PAYMENT'); const service=new BookingStateService(prisma as never); await service.transition(bookingId,'EXPIRED','sandbox expiry'); expect(tx.bookingStatusHistory.create).toHaveBeenCalledWith({data:{bookingId,fromStatus:'PENDING_PAYMENT',toStatus:'EXPIRED',reason:'sandbox expiry'}}); expect(tx.roomOccupancy.deleteMany).toHaveBeenCalledWith({where:{bookingId}}); expect(tx.resourceHold.updateMany).toHaveBeenCalled(); });
  it('rejects direct invalid transitions', async () => { const {prisma}=transaction('PENDING_PAYMENT'); const service=new BookingStateService(prisma as never); await expect(service.transition(bookingId,'CONFIRMED')).rejects.toMatchObject({response:expect.objectContaining({code:'INVALID_BOOKING_TRANSITION'})}); });
});
