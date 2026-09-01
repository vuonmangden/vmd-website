import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RoomRateRulesService } from './room-rate-rules.service';

describe('RoomRateRulesService', () => {
  let service: RoomRateRulesService;
  const tx = {
    roomType: { findFirst: jest.fn() },
    roomRateRule: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    roomRateRule: { findMany: jest.fn() },
    appSetting: { findUnique: jest.fn() },
  };
  beforeEach(async () => { jest.clearAllMocks(); const module = await Test.createTestingModule({ providers: [RoomRateRulesService, { provide: PrismaService, useValue: prisma }] }).compile(); service = module.get(RoomRateRulesService); });
  const input = { roomTypeId: '00000000-0000-4000-8000-000000000003', name: 'SYNTHETIC rate', dateFrom: '2099-01-01', dateTo: '2099-02-01', nightlyPrice: '1000000' };
  const actorId = '00000000-0000-4000-8000-000000000010';
  it('creates integer VND rate rules and audit evidence atomically', async () => {
    tx.roomType.findFirst.mockResolvedValue({ id: input.roomTypeId });
    tx.roomRateRule.create.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000011', nightlyPrice: 1000000n });
    await service.create(input, actorId, '00000000-0000-4000-8000-000000000012');
    expect(tx.roomRateRule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ nightlyPrice: 1000000n, extraAdultPrice: 0n, status: 'DRAFT' }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'room_rate_rule.created', actorId, afterData: expect.objectContaining({ nightlyPrice: '1000000' }) }) });
  });
  it('rejects an invalid date range before DB write', async () => { await expect(service.create({ ...input, dateTo: input.dateFrom }, actorId, '')).rejects.toBeInstanceOf(BadRequestException); expect(tx.roomType.findFirst).not.toHaveBeenCalled(); });
  it('rejects a missing room type', async () => { tx.roomType.findFirst.mockResolvedValue(null); await expect(service.create(input, actorId, '')).rejects.toBeInstanceOf(NotFoundException); });
  it('updates a rule with before/after audit and a required operational reason', async () => {
    const current = { id: '00000000-0000-4000-8000-000000000011', dateFrom: new Date('2026-09-01T00:00:00.000Z'), dateTo: new Date('2026-10-01T00:00:00.000Z'), minNights: 1, maxNights: null, nightlyPrice: 500000n };
    const updated = { ...current, nightlyPrice: 780000n, priority: 100, status: 'ACTIVE' };
    tx.roomRateRule.findUnique.mockResolvedValue(current);
    tx.roomRateRule.update.mockResolvedValue(updated);
    await service.update(current.id, { nightlyPrice: '780000', priority: 100, status: 'ACTIVE', reason: 'Mở giá cao điểm 2/9' }, actorId, '');
    expect(tx.roomRateRule.update).toHaveBeenCalledWith({ where: { id: current.id }, data: { nightlyPrice: 780000n, priority: 100, status: 'ACTIVE' } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'room_rate_rule.updated', reason: 'Mở giá cao điểm 2/9', beforeData: expect.objectContaining({ nightlyPrice: '500000' }), afterData: expect.objectContaining({ nightlyPrice: '780000' }) }) });
  });
  it('orders list by priority then date', async () => { await service.list(input.roomTypeId); expect(prisma.roomRateRule.findMany).toHaveBeenCalledWith({ where: { roomTypeId: input.roomTypeId }, orderBy: [{ priority: 'desc' }, { dateFrom: 'asc' }] }); });
  it('returns approved holiday-price metadata to authorized CMS callers', async () => {
    const setting = { value: { version: '2026-09-01.v1' }, updatedAt: new Date() };
    prisma.appSetting.findUnique.mockResolvedValue(setting);
    await expect(service.catalogPolicy()).resolves.toBe(setting);
  });
});
