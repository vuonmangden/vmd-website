import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('records trusted actor context while redacting secrets and PII', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'audit-id' });
    const service = new AuditService({ auditLog: { create } } as never);
    await service.record({ actorType: 'STAFF', actorId: '00000000-0000-4000-8000-000000000001', action: 'booking.update', resourceType: 'booking', resourceId: '00000000-0000-4000-8000-000000000002', afterData: { status: 'CONFIRMED', email: 'guest@example.com', nested: { accessToken: 'secret' } }, correlationId: '00000000-0000-4000-8000-000000000003' });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: '00000000-0000-4000-8000-000000000001', afterData: { status: 'CONFIRMED', email: '[REDACTED]', nested: { accessToken: '[REDACTED]' } } }) });
  });
  it('returns ordered paginated audit logs with allowed filters only', async () => {
    const findMany = jest.fn().mockResolvedValue([]); const count = jest.fn().mockResolvedValue(0); const transaction = jest.fn().mockResolvedValue([[], 0]);
    const service = new AuditService({ auditLog: { findMany, count }, $transaction: transaction } as never);
    await expect(service.list({ page: 2, pageSize: 20, action: 'booking.update', resourceType: 'booking' })).resolves.toEqual({ items: [], page: 2, pageSize: 20, total: 0 });
    expect(transaction).toHaveBeenCalled(); expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20, orderBy: { createdAt: 'desc' } }));
  });
});
