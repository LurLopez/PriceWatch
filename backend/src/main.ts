import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { logStructured } from './common/structured-logger';

async function bootstrap() {
  // El body parser se registra explícitamente con un límite acotado.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.setGlobalPrefix('api');
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(
    helmet({
      // Swagger e Ionic usan estilos inline; el CSP se delega al proxy/Nginx.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  const allowedOrigins =
    corsOrigin && corsOrigin !== '*'
      ? corsOrigin
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : true;
  app.enableCors({ origin: allowedOrigins });

  const config = new DocumentBuilder()
    .setTitle('PriceWatch API')
    .setDescription(
      'API REST Gateway y orquestación del Comparador Multicriterio PriceWatch',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'Estado del servicio y base de datos')
    .addTag('Metrics', 'Métricas operativas básicas (ADMIN)')
    .addTag('Products', 'Catálogo de productos persistidos en PostgreSQL')
    .addTag('Ranking', 'Evaluación multicriterio MAUT e historial')
    .addTag('Auth', 'Autenticación JWT y perfil')
    .addTag('Sources', 'Consulta acotada de la fuente de demostración (ADMIN)')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logStructured('info', 'server.started', {
    port: Number(port),
    environment:
      process.env.ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    swagger: `/api/docs`,
  });
}

bootstrap();
