import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SePayWebhookDto } from './sepay-webhook.dto';

const valid = { id: 'event-1', gateway: 'MBBank', transactionDate: '2026-08-13', accountNumber: '1234', subAccount: '', transferType: 'in', transferAmount: 100000, accumulated: 100000, code: '', content: 'VMD BK260813A1B2', referenceCode: 'ref-1', description: 'test' };

describe('SePayWebhookDto', () => {
  it('rejects float VND amount and unsupported transfer types', async () => {
    const errors = await validate(plainToInstance(SePayWebhookDto, { ...valid, transferAmount: 100.5, transferType: 'refund' }));
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['transferAmount', 'transferType']));
  });
});
