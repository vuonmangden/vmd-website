import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => { it('creates the API shell', async () => { const module = await Test.createTestingModule({ imports: [AppModule] }).compile(); expect(module).toBeDefined(); }); });
