import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma.service';

describe('PriceWatch API (e2e)', () => {
  let app: INestApplication<App>;
  let passwordHash: string;
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
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secret123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@pricewatch.local',
      passwordHash,
      role: 'ADMIN',
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

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
      .expect(({ body, headers }) => {
        expect(body.status).toBe('ok');
        expect(body.database).toBe('connected');
        expect(headers['x-request-id']).toBeDefined();
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

  it('rechaza credenciales inválidas', () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nadie@pricewatch.local', password: 'incorrecta' })
      .expect(401);
  });

  it('inicia sesión y permite consultar el perfil con el token JWT', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@pricewatch.local', password: 'secret123' })
      .expect(200);

    expect(login.body.accessToken).toBeDefined();
    expect(login.body.user.role).toBe('ADMIN');

    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('admin@pricewatch.local');
        expect(body).not.toHaveProperty('passwordHash');
      });
  });

  it('protege el historial de rankings sin token', () => {
    return request(app.getHttpServer()).get('/api/ranking/history').expect(401);
  });

  it('protege las métricas y las expone al ADMIN', async () => {
    await request(app.getHttpServer()).get('/api/metrics').expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@pricewatch.local', password: 'secret123' })
      .expect(200);

    return request(app.getHttpServer())
      .get('/api/metrics')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalRequests).toBeGreaterThan(0);
        expect(body.averageResponseTimeMs).toBeGreaterThanOrEqual(0);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
