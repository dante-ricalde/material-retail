import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DatabaseService } from './database/database.service';
import { bindDatabase } from './common/merchants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  // Late-bind the global database handle for slug→id resolvers shared across controllers.
  bindDatabase(app.get(DatabaseService));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      // Fly web deploy (https). Add additional origins via WEB_ORIGIN env (comma-separated)
      // when scaling to multiple regions or preview envs.
      ...(process.env.WEB_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
        'https://material-retail-dante-web.fly.dev',
      ]),
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
