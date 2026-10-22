import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RankingService } from './ranking.service';
import { PrismaService } from '../prisma.service';
import { ProductsService } from '../products/products.service';
import { of } from 'rxjs';

describe('RankingService', () => {
  let service: RankingService;
  let prisma: {
    rankingHistory: { create: jest.Mock; findMany: jest.Mock };
    sourceRun: { findUnique: jest.Mock };
  };
  let productsService: { findAll: jest.Mock };
  let httpService: { post: jest.Mock };

  beforeEach(async () => {
    prisma = {
      rankingHistory: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      sourceRun: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'a6c593c9-b648-46f8-925e-0d9624575bba',
          source: 'dummyjson',
          status: 'SUCCEEDED',
          listings: [
            {
              id: 'listing-1',
              externalId: '78',
              title: 'Laptop externo',
              category: 'laptops',
              brand: 'Marca',
              price: 1000,
              rating: 4,
              availabilityReference: 10,
              sourceUrl: 'https://dummyjson.com/products/78',
              currency: null,
              specs: {},
            },
            {
              id: 'listing-2',
              externalId: '79',
              title: 'Laptop externo 2',
              category: 'laptops',
              brand: 'Marca',
              price: 500,
              rating: 3,
              availabilityReference: 5,
              sourceUrl: 'https://dummyjson.com/products/79',
              currency: null,
              specs: {},
            },
          ],
        }),
      },
    };

    productsService = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: '1',
          name: 'Laptop A',
          category: 'Laptops',
          brand: 'BrandX',
          price: 1000,
          qualityRating: 4.5,
          stock: 10,
          specsScore: 85,
        },
        {
          id: '2',
          name: 'Laptop B',
          category: 'Laptops',
          brand: 'BrandY',
          price: 500,
          qualityRating: 3.8,
          stock: 20,
          specsScore: 65,
        },
      ]),
    };

    httpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: productsService },
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:8000'),
          },
        },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe calcular ranking con fallback cuando FastAPI no está disponible', async () => {
    httpService.post.mockImplementationOnce(() => {
      throw new Error('Connection refused');
    });

    const weights = {
      weight_price: 0.4,
      weight_quality: 0.3,
      weight_stock: 0.1,
      weight_specs: 0.2,
    };

    const result = await service.evaluate(weights);

    expect(result.status).toBe('success_fallback');
    expect(result.ranking.length).toBe(2);
    expect(result.ranking[0].final_score).toBeGreaterThan(0);
    expect(prisma.rankingHistory.create).toHaveBeenCalled();
  });

  it('debe enviar al motor una corrida normalizada y el contexto seleccionado', async () => {
    httpService.post.mockReturnValueOnce(
      of({
        data: {
          status: 'success',
          total_products_evaluated: 2,
          top_recommended_product_id: 'dummyjson:78',
          global_explanation: 'Ranking de prueba',
          warnings: [],
          active_criteria: ['price', 'quality', 'stock'],
          ignored_criteria: ['specs'],
          effective_weights: {
            weight_price: 0.5,
            weight_quality: 0.375,
            weight_stock: 0.125,
            weight_specs: 0,
          },
          ranking: [
            { id: 'dummyjson:78', name: 'Laptop externo', final_score: 80 },
            { id: 'dummyjson:79', name: 'Laptop externo 2', final_score: 50 },
          ],
        },
      }),
    );

    const result = await service.evaluate(
      undefined,
      undefined,
      'equilibrado',
      'a6c593c9-b648-46f8-925e-0d9624575bba',
    );
    const requestBody = httpService.post.mock.calls[0][1];

    expect(requestBody.context_profile).toBe('equilibrado');
    expect(requestBody.source_run_id).toBe(
      'a6c593c9-b648-46f8-925e-0d9624575bba',
    );
    expect(requestBody.products[0]).toMatchObject({
      id: 'dummyjson:78',
      quality_rating: 4,
      stock: 10,
      specs_score: null,
      source: 'dummyjson',
    });
    expect(result.ignored_criteria).toEqual(['specs']);
    expect(prisma.rankingHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contextProfile: 'equilibrado',
        sourceRunId: 'a6c593c9-b648-46f8-925e-0d9624575bba',
      }),
    });
  });
});
