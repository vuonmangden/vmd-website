import { Test } from '@nestjs/testing';
import { WorkerModule } from './worker.module';

describe('WorkerModule', () => { it('creates the worker shell', async () => { const module = await Test.createTestingModule({ imports: [WorkerModule] }).compile(); expect(module).toBeDefined(); }); });
