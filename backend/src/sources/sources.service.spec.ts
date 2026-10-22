import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SearchDemoProductsDto } from './dto/search-demo-products.dto';
import { SourcesService } from './sources.service';
import { of } from 'rxjs';

describe('SourcesService', () => {
  const runId = 'a6c593c9-b648-46f8-925e-0d9624575bba';
  const sourceResponse = {
    provider: 'dummyjson',
    query: 'laptop',
    retrieved_at: '2026-10-22T12:00:00.000Z',
    duration_ms: 42,
    metrics: { received: 1, accepted: 1, rejected: 0, duplicates: 0 },
    products: [
      {
        external_id: '78',
        title: 'Laptop de demostración',
        category: 'laptops',
        brand: 'Marca de ejemplo',
        price: 1999.99,
        currency: null,
        rating: 4.2,
        availability_reference: 24,
        specs: { warranty: '1 year warranty' },
        source_url: 'https://dummyjson.com/products/78',
        content_hash: 'a'.repeat(64),
        retrieved_at: '2026-10-22T12:00:00.000Z',
      },
    ],
  };

  function createService(enabled = true, responsePayload = sourceResponse) {
    const listing = {
      id: 'listing-1',
      runId,
      externalId: '78',
      title: 'Laptop de demostración',
      category: 'laptops',
      brand: 'Marca de ejemplo',
      price: 1999.99,
      currency: null,
      rating: 4.2,
      availabilityReference: 24,
      specs: { warranty: '1 year warranty' },
      sourceUrl: 'https://dummyjson.com/products/78',
      contentHash: 'a'.repeat(64),
      retrievedAt: new Date('2026-10-22T12:00:00.000Z'),
    };
    const run = {
      id: runId,
      source: 'dummyjson',
      query: 'laptop',
      status: 'SUCCEEDED',
      received: 1,
      accepted: 1,
      rejected: 0,
      duplicates: 0,
      startedAt: new Date('2026-10-22T12:00:00.000Z'),
      retrievedAt: new Date('2026-10-22T12:00:00.000Z'),
      durationMs: 45,
      errorCode: null,
      listings: [listing],
    };
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue(run);
    const prisma = {
      sourceRun: {
        create: jest.fn().mockResolvedValue({ id: runId }),
        update,
        findMany: jest.fn().mockResolvedValue([run]),
        findUnique: jest.fn().mockResolvedValue(run),
      },
      sourceListing: { createMany },
      $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
        callback({ sourceRun: { update }, sourceListing: { createMany } }),
      ),
    } as unknown as PrismaService;
    const httpService = {
      post: jest.fn().mockReturnValue(of({ data: responsePayload })),
    } as unknown as HttpService;
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'DEMO_PRODUCTS_SOURCE_ENABLED')
          return enabled ? 'true' : 'false';
        return 'http://python-service:8000';
      }),
    } as unknown as ConfigService;

    return {
      service: new SourcesService(prisma, httpService, configService),
      prisma,
      httpService,
      createMany,
    };
  }

  it('does not call Python while the source is disabled', async () => {
    const { service, httpService, prisma } = createService(false);
    const dto = new SearchDemoProductsDto();
    dto.query = 'laptop';
    dto.limit = 5;
    dto.acknowledged = true;

    await expect(service.searchDemoProducts(dto)).rejects.toThrow(
      HttpException,
    );
    expect(
      (httpService as unknown as { post: jest.Mock }).post,
    ).not.toHaveBeenCalled();
    expect(
      (prisma as unknown as { sourceRun: { create: jest.Mock } }).sourceRun
        .create,
    ).not.toHaveBeenCalled();
  });

  it('persists only normalized products with source provenance and metrics', async () => {
    const { service, createMany, httpService } = createService();
    const dto = new SearchDemoProductsDto();
    dto.query = 'laptop';
    dto.limit = 5;
    dto.acknowledged = true;

    const result = await service.searchDemoProducts(dto);

    expect(
      (httpService as unknown as { post: jest.Mock }).post,
    ).toHaveBeenCalledWith(
      'http://python-service:8000/sources/demo-products/search',
      { query: 'laptop', limit: 5, acknowledged: true },
      expect.objectContaining({ timeout: 15_000 }),
    );
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          runId,
          externalId: '78',
          contentHash: 'a'.repeat(64),
          sourceUrl: 'https://dummyjson.com/products/78',
        }),
      ],
    });
    expect(result.run_id).toBe(runId);
    expect(result.metrics.accepted).toBe(1);
    expect(result.products[0].currency).toBeNull();
  });

  it('enforces a cooldown between manual requests in the same process', async () => {
    const { service } = createService();
    const dto = new SearchDemoProductsDto();
    dto.query = 'laptop';
    dto.limit = 5;
    dto.acknowledged = true;

    await service.searchDemoProducts(dto);
    await expect(service.searchDemoProducts(dto)).rejects.toThrow(
      HttpException,
    );
  });

  it('marks a malformed upstream contract as failed and persists no listing', async () => {
    const invalidResponse = {
      ...sourceResponse,
      metrics: { received: 2, accepted: 1, rejected: 0, duplicates: 0 },
    };
    const { service, createMany, prisma } = createService(
      true,
      invalidResponse,
    );
    const dto = new SearchDemoProductsDto();
    dto.query = 'laptop';
    dto.limit = 5;
    dto.acknowledged = true;

    await expect(service.searchDemoProducts(dto)).rejects.toThrow(
      HttpException,
    );
    expect(createMany).not.toHaveBeenCalled();
    expect(
      (prisma as unknown as { sourceRun: { update: jest.Mock } }).sourceRun
        .update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorCode: 'INVALID_SOURCE_RESPONSE',
        }),
      }),
    );
  });
});
