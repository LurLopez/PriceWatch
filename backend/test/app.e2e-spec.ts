import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma.service';

describe('PriceWatch API (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'prod-001',
          name: 'ThinkPad Pro X1 Gen 10',
          category: 'Laptops',
          brand: 'Lenovo',
          price: 1250,
          qualityRating: 4.8,
          stock: 8,
          specsScore: 92,
          imageUrl: null,
          description: 'Producto de prueba',
        },
      ]),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(HttpService)
      .useValue({
        get: jest.fn().mockReturnValue(of({ data: { status: 'ok' } })),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  it('expone el estado del servicio en /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.database).toBe('connected');
      });
  });

  it('devuelve el catálogo con nombres de campo del contrato HTTP', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].quality_rating).toBe(4.8);
        expect(body[0].specs_score).toBe(92);
        expect(body[0]).not.toHaveProperty('qualityRating');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
