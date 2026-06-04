import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = [
    process.env.WEB_URL ?? 'http://localhost:3000',
    ...(process.env.WEB_URLS?.split(',').map((u) => u.trim()) ?? []),
  ].filter(Boolean);
  app.enableCors({
    origin:
      corsOrigins.length <= 1 ? corsOrigins[0] : [...new Set(corsOrigins)],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on port ${port}`);
}

bootstrap();
