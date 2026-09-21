import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: { product: { findMany: jest.Mock; findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe devolver productos desde Prisma si existen', async () => {
    const mockList = [
      { id: '1', name: 'Laptop A', category: 'Laptops', price: 1000, qualityRating: 4.5, stock: 10, specsScore: 85 },
    ];
    prisma.product.findMany.mockResolvedValueOnce(mockList);

    const result = await service.findAll();
    expect(result).toEqual(mockList);
  });

  it('debe devolver el catálogo fallback si Prisma está vacío o falla', async () => {
    prisma.product.findMany.mockRejectedValueOnce(new Error('DB caída'));

    const result = await service.findAll();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBeDefined();
  });
});
