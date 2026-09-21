import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global /api para todos los endpoints
  app.setGlobalPrefix('api');

  // Validación de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Permitir CORS para peticiones desde el frontend de Angular (puerto 4200)
  app.enableCors();

  // Documentación OpenAPI / Swagger en /api/docs
  const config = new DocumentBuilder()
    .setTitle('PriceWatch API')
    .setDescription('API REST Gateway y orquestación del Comparador Multicriterio PriceWatch')
    .setVersion('1.0.0')
    .addTag('Health', 'Estado del servicio y base de datos')
    .addTag('Products', 'Catálogo de productos persistidos en PostgreSQL')
    .addTag('Ranking', 'Evaluación multicriterio MAUT e historial')
    .addTag('Auth', 'Autenticación básica con token Bearer')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend PriceWatch escuchando en: http://localhost:${port}/api`);
  console.log(`Swagger OpenAPI disponible en: http://localhost:${port}/api/docs`);
}

bootstrap();
