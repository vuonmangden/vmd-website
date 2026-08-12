import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoomTypesService } from './room-types.service';

describe('RoomTypesService', () => {
  let service: RoomTypesService;
  const prisma = {
    roomType: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [RoomTypesService, { provide: PrismaService, useValue: prisma }] }).compile();
    service = module.get(RoomTypesService);
  });

  it('creates a room type with normalized code/name/slug and no financial fields', async () => {
    prisma.roomType.create.mockResolvedValue({ id: 'room-type-id' });
    await service.create({ code: ' SYNTHETIC-RT-1 ', name: ' Synthetic ', slug: ' Synthetic-Room ', standardAdults: 2, maxAdults: 2, maxTotalGuests: 2 });
    expect(prisma.roomType.create).toHaveBeenCalledWith({ data: expect.objectContaining({ code: 'SYNTHETIC-RT-1', name: 'Synthetic', slug: 'synthetic-room', status: 'DRAFT' }) });
  });

  it('rejects invalid capacity before database write', async () => {
    await expect(service.create({ code: 'SYNTHETIC-X', name: 'X', slug: 'synthetic-x', standardAdults: 3, maxAdults: 2, maxTotalGuests: 2 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.roomType.create).not.toHaveBeenCalled();
  });

  it('lists only non-archived room types in display order', async () => {
    await service.list();
    expect(prisma.roomType.findMany).toHaveBeenCalledWith({ where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  });

  it('fails closed when a room type is missing or archived', async () => {
    prisma.roomType.findFirst.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('archives rather than hard-deleting the room type', async () => {
    prisma.roomType.findFirst.mockResolvedValue({ id: 'room-type-id', standardAdults: 2, maxAdults: 2, maxChildren: 0, maxTotalGuests: 2 });
    prisma.roomType.update.mockResolvedValue({ id: 'room-type-id', status: 'INACTIVE' });
    await service.archive('room-type-id');
    expect(prisma.roomType.update).toHaveBeenCalledWith({ where: { id: 'room-type-id' }, data: { deletedAt: expect.any(Date), status: 'INACTIVE' } });
  });
});
