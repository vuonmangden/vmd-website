import { NestFactory } from '@nestjs/core';
import { MessageChannel } from 'node:worker_threads';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  await new Promise<void>((resolve) => {
    const keepAlive = new MessageChannel();
    keepAlive.port1.on('message', () => undefined);

    const shutdown = (): void => {
      keepAlive.port1.close();
      keepAlive.port2.close();
      resolve();
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });

  await app.close();
}

void bootstrap();
