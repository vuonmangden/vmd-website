import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RoomRateRulesService } from './room-rate-rules.service';

describe('RoomRateRulesService', () => {
  let service: RoomRateRulesService;
  const prisma = { roomType: { findFirst: jest.fn() }, roomRateRule: { create: jest.fn(), findMany: jest.fn() } };
  beforeEach(async () => { jest.clearAllMocks(); const module = await Test.createTestingModule({ providers: [RoomRateRulesService, { provide: PrismaService, useValue: prisma }] }).compile(); service = module.get(RoomRateRulesService); });
  const input = { roomTypeId: '00000000-0000-4000-8000-000000000003', name: 'SYNTHETIC rate', dateFrom: '2099-01-01', dateTo: '2099-02-01', nightlyPrice: '1000000' };
  it('creates integer VND-only sandbox rate rule', async () => { prisma.roomType.findFirst.mockResolvedValue({ id: input.roomTypeId }); prisma.roomRateRule.create.mockResolvedValue({ id: 'rule' }); await service.create(input); expect(prisma.roomRateRule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ nightlyPrice: 1000000n, extraAdultPrice: 0n, status: 'DRAFT' }) }); });
  it('rejects an invalid date range before DB write', async () => { await expect(service.create({ ...input, dateTo: input.dateFrom })).rejects.toBeInstanceOf(BadRequestException); expect(prisma.roomType.findFirst).not.toHaveBeenCalled(); });
  it('rejects a missing room type', async () => { prisma.roomType.findFirst.mockResolvedValue(null); await expect(service.create(input)).rejects.toBeInstanceOf(NotFoundException); });
  it('orders list by priority then date', async () => { await service.list(input.roomTypeId); expect(prisma.roomRateRule.findMany).toHaveBeenCalledWith({ where: { roomTypeId: input.roomTypeId }, orderBy: [{ priority: 'desc' }, { dateFrom: 'asc' }] }); });
});
