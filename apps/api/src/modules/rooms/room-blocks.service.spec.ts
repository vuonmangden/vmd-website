import { NotFoundException } from '@nestjs/common';
import { RoomBlocksService } from './room-blocks.service';

describe('RoomBlocksService', () => {
  const roomId = '00000000-0000-4000-8000-000000000004';
  const actorId = '00000000-0000-4000-8000-000000000006';
  const blockId = '00000000-0000-4000-8000-000000000007';
  const room = { id: roomId };
  const prisma = { room: { findFirst: jest.fn() }, roomBlock: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() } };
  const service = new RoomBlocksService(prisma as never);
  const dto = { startDate: '2099-01-10', endDate: '2099-01-12', reason: 'Synthetic maintenance', blockType: 'MAINTENANCE' };

  beforeEach(() => jest.resetAllMocks());

  it('creates a block with a trusted staff actor', async () => {
    prisma.room.findFirst.mockResolvedValue(room); prisma.roomBlock.create.mockResolvedValue({ id: blockId });
    await expect(service.create(roomId, actorId, dto)).resolves.toEqual({ id: blockId });
    expect(prisma.roomBlock.create).toHaveBeenCalledWith({ data: expect.objectContaining({ roomId, createdBy: actorId, blockType: 'MAINTENANCE', startDate: new Date('2099-01-10T00:00:00.000Z') }) });
  });
  it('rejects an invalid date range before writing', async () => {
    await expect(service.create(roomId, actorId, { ...dto, endDate: dto.startDate })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_ROOM_BLOCK' }) });
    expect(prisma.roomBlock.create).not.toHaveBeenCalled();
  });
  it('fails closed when the room is missing or archived', async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    await expect(service.create(roomId, actorId, dto)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('cancels only an active block attached to the requested room', async () => {
    prisma.roomBlock.findFirst.mockResolvedValue({ id: blockId }); prisma.roomBlock.update.mockResolvedValue({ id: blockId, cancelledAt: new Date() });
    await service.cancel(roomId, blockId);
    expect(prisma.roomBlock.findFirst).toHaveBeenCalledWith({ where: { id: blockId, roomId, cancelledAt: null } });
  });
});
