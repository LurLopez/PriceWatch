import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RankingService } from './ranking.service';
import { PrismaService } from '../prisma.service';
import { ProductsService } from '../products/products.service';

describe('RankingService', () => {
  let service: RankingService;
  let prisma: { rankingHistory: { create: jest.Mock; findMany: jest.Mock } };
  let productsService: { findAll: jest.Mock };
  let httpService: { post: jest.Mock };

  beforeEach(async () => {
    prisma = {
      rankingHistory: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    productsService = {
      findAll: jest.fn().mockResolvedValue([
        { id: '1', name: 'Laptop A', category: 'Laptops', brand: 'BrandX', price: 1000, qualityRating: 4.5, stock: 10, specsScore: 85 },
        { id: '2', name: 'Laptop B', category: 'Laptops', brand: 'BrandY', price: 500, qualityRating: 3.8, stock: 20, specsScore: 65 },
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
});
