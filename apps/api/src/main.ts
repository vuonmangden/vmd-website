import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = corsOriginsForEnvironment();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => callback(null, origin === undefined || corsOrigins.has(origin)),
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new ResponseTransformInterceptor(),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('VMD API')
    .setDescription('Villa Mộc Đà Lạt API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number.parseInt(process.env.API_PORT ?? '3002', 10);
  await app.listen(port);
}

void bootstrap();

function corsOriginsForEnvironment(): Set<string> {
  const configured = process.env['CORS_ALLOWED_ORIGINS']
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const environment = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';

  if (environment === 'production' && (!configured || configured.length === 0)) {
    throw new Error('CORS_ALLOWED_ORIGINS is required in production');
  }

  return new Set(configured ?? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://staging.vuonmangden.vn',
  ]);
}
