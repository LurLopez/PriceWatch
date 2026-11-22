import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../common/request-context.service';
import { PrismaService } from '../prisma.service';
import { SearchDemoProductsDto } from './dto/search-demo-products.dto';

interface DemoSourceProduct {
  external_id: string;
  title: string;
  category?: string | null;
  brand?: string | null;
  price: number;
  currency?: string | null;
  rating?: number | null;
  availability_reference?: number | null;
  specs?: Record<string, unknown>;
  source_url: string;
  content_hash: string;
  retrieved_at: string;
}

interface DemoSourceResponse {
  provider: string;
  query: string;
  retrieved_at: string;
  duration_ms: number;
  metrics: {
    received: number;
    accepted: number;
    rejected: number;
    duplicates: number;
  };
  products: DemoSourceProduct[];
}

const SOURCE_NAME = 'dummyjson';
const SEARCH_COOLDOWN_MS = 5_000;
const MAX_RESPONSE_BYTES = 1_000_000;

@Injectable()
export class SourcesService {
  private readonly pythonUrl: string;
  private lastRequestAt: number | null = null;
  private requestInFlight = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    this.pythonUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:8000';
  }

  async searchDemoProducts(dto: SearchDemoProductsDto) {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'La búsqueda de la fuente está desactivada.',
      );
    }

    const now = Date.now();
    if (this.requestInFlight) {
      throw new HttpException(
        'Ya hay una consulta a la fuente en curso.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (
      this.lastRequestAt !== null &&
      now - this.lastRequestAt < SEARCH_COOLDOWN_MS
    ) {
      throw new HttpException(
        'Espera 5 segundos antes de volver a consultar la fuente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.requestInFlight = true;
    this.lastRequestAt = now;
    let run: { id: string } | null = null;

    try {
      run = await this.prisma.sourceRun.create({
        data: {
          source: SOURCE_NAME,
          query: dto.query,
          status: 'RUNNING',
        },
      });
      const startedAt = Date.now();
      const response = await firstValueFrom(
        this.httpService.post<DemoSourceResponse>(
          `${this.pythonUrl}/sources/demo-products/search`,
          {
            query: dto.query,
            limit: dto.limit,
            acknowledged: dto.acknowledged,
          },
          {
            timeout: 15_000,
            maxContentLength: MAX_RESPONSE_BYTES,
            maxBodyLength: 10_000,
            headers: {
              'x-request-id': this.requestContext.getRequestId() ?? '',
            },
          },
        ),
      );
      const durationMs = Date.now() - startedAt;
      const sourceData = this.validateResponse(response.data, dto);
      const retrievedAt = new Date(sourceData.retrieved_at);

      await this.prisma.$transaction(async (transaction) => {
        if (sourceData.products.length > 0) {
          await transaction.sourceListing.createMany({
            data: sourceData.products.map((product) => ({
              runId: run.id,
              externalId: product.external_id,
              title: product.title,
              category: product.category ?? null,
              brand: product.brand ?? null,
              price: product.price,
              currency: product.currency ?? null,
              rating: product.rating ?? null,
              availabilityReference: product.availability_reference ?? null,
              specs: (product.specs ?? {}) as Prisma.InputJsonValue,
              sourceUrl: product.source_url,
              contentHash: product.content_hash,
              retrievedAt: new Date(product.retrieved_at),
            })),
          });
        }

        await transaction.sourceRun.update({
          where: { id: run.id },
          data: {
            status: 'SUCCEEDED',
            received: sourceData.metrics.received,
            accepted: sourceData.metrics.accepted,
            rejected: sourceData.metrics.rejected,
            duplicates: sourceData.metrics.duplicates,
            retrievedAt,
            durationMs: Math.max(0, Math.round(durationMs)),
          },
        });
      });

      return this.getRun(run.id);
    } catch (error) {
      if (!run) {
        throw error;
      }
      const errorCode = this.getSafeErrorCode(error);
      await this.prisma.sourceRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorCode,
          durationMs: Math.max(0, Date.now() - now),
        },
      });

      if (isAxiosError(error) && error.response?.status === 429) {
        throw new HttpException(
          'La fuente limitó la consulta; inténtalo más tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new ServiceUnavailableException(
          'La consulta a la fuente superó el timeout.',
        );
      }
      if (
        error instanceof BadGatewayException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (isAxiosError(error)) {
        throw new BadGatewayException(
          'No se pudo completar la consulta a la fuente.',
        );
      }
      throw error;
    } finally {
      this.requestInFlight = false;
    }
  }

  async getRuns() {
    const runs = await this.prisma.sourceRun.findMany({
      where: { source: SOURCE_NAME },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        source: true,
        query: true,
        status: true,
        received: true,
        accepted: true,
        rejected: true,
        duplicates: true,
        startedAt: true,
        retrievedAt: true,
        durationMs: true,
        errorCode: true,
      },
    });

    return runs.map((run) => this.toRunSummary(run));
  }

  async getRun(id: string) {
    const run = await this.prisma.sourceRun.findUnique({
      where: { id },
      include: { listings: { orderBy: { title: 'asc' } } },
    });
    if (!run || run.source !== SOURCE_NAME) {
      throw new NotFoundException('No se encontró la consulta solicitada.');
    }

    return {
      ...this.toRunSummary(run),
      products: run.listings.map((listing) => ({
        external_id: listing.externalId,
        title: listing.title,
        category: listing.category,
        brand: listing.brand,
        price: listing.price,
        currency: listing.currency,
        rating: listing.rating,
        availability_reference: listing.availabilityReference,
        specs: listing.specs,
        source_url: listing.sourceUrl,
        content_hash: listing.contentHash,
        retrieved_at: listing.retrievedAt.toISOString(),
      })),
    };
  }

  private isEnabled(): boolean {
    return (
      this.configService
        .get<string>('DEMO_PRODUCTS_SOURCE_ENABLED')
        ?.toLowerCase() === 'true'
    );
  }

  private validateResponse(
    data: DemoSourceResponse,
    dto: SearchDemoProductsDto,
  ): DemoSourceResponse {
    const validTimestamp =
      typeof data?.retrieved_at === 'string' &&
      !Number.isNaN(Date.parse(data.retrieved_at));
    const metrics = data?.metrics;
    const validMetrics =
      metrics &&
      [
        metrics.received,
        metrics.accepted,
        metrics.rejected,
        metrics.duplicates,
      ].every((value) => Number.isInteger(value) && value >= 0) &&
      metrics.received <= dto.limit &&
      metrics.received ===
        metrics.accepted + metrics.rejected + metrics.duplicates;
    const validProducts =
      data?.provider === SOURCE_NAME &&
      data.query === dto.query &&
      Array.isArray(data.products) &&
      data.products.length <= dto.limit &&
      data.metrics?.accepted === data.products.length;

    if (!validTimestamp || !validMetrics || !validProducts) {
      throw new BadGatewayException(
        'La respuesta normalizada de la fuente no cumple el contrato esperado.',
      );
    }

    const seenIds = new Set<string>();
    for (const product of data.products) {
      let sourceUrl: URL;
      try {
        sourceUrl = new URL(product.source_url);
      } catch {
        throw new BadGatewayException(
          'La fuente devolvió un enlace no válido.',
        );
      }
      if (
        !product.external_id ||
        !/^\d+$/.test(product.external_id) ||
        seenIds.has(product.external_id) ||
        !product.title ||
        !Number.isFinite(product.price) ||
        product.price <= 0 ||
        sourceUrl.origin !== 'https://dummyjson.com' ||
        sourceUrl.pathname !== `/products/${product.external_id}` ||
        sourceUrl.search !== '' ||
        sourceUrl.hash !== '' ||
        sourceUrl.username !== '' ||
        sourceUrl.password !== '' ||
        Number.isNaN(Date.parse(product.retrieved_at)) ||
        (product.rating !== null &&
          product.rating !== undefined &&
          (!Number.isFinite(product.rating) ||
            product.rating < 0 ||
            product.rating > 5)) ||
        (product.availability_reference !== null &&
          product.availability_reference !== undefined &&
          (!Number.isInteger(product.availability_reference) ||
            product.availability_reference < 0)) ||
        !product.specs ||
        typeof product.specs !== 'object' ||
        Array.isArray(product.specs) ||
        !/^[a-f0-9]{64}$/.test(product.content_hash)
      ) {
        throw new BadGatewayException(
          'La fuente devolvió un producto no válido.',
        );
      }
      seenIds.add(product.external_id);
    }

    return data;
  }

  private getSafeErrorCode(error: unknown): string {
    if (isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (
        detail &&
        typeof detail === 'object' &&
        'code' in detail &&
        typeof detail.code === 'string'
      ) {
        return detail.code.slice(0, 80);
      }
      if (error.code === 'ECONNABORTED') return 'PYTHON_TIMEOUT';
      if (error.response?.status === 429) return 'SOURCE_RATE_LIMITED';
      return `PYTHON_HTTP_${error.response?.status ?? 'ERROR'}`;
    }
    if (error instanceof BadGatewayException) return 'INVALID_SOURCE_RESPONSE';
    return 'SOURCE_REQUEST_FAILED';
  }

  private toRunSummary(run: {
    id: string;
    source: string;
    query: string;
    status: string;
    received: number;
    accepted: number;
    rejected: number;
    duplicates: number;
    startedAt: Date;
    retrievedAt: Date | null;
    durationMs: number | null;
    errorCode: string | null;
  }) {
    return {
      run_id: run.id,
      provider: run.source,
      query: run.query,
      status: run.status,
      started_at: run.startedAt.toISOString(),
      retrieved_at: run.retrievedAt?.toISOString() ?? null,
      duration_ms: run.durationMs,
      error_code: run.errorCode,
      metrics: {
        received: run.received,
        accepted: run.accepted,
        rejected: run.rejected,
        duplicates: run.duplicates,
      },
    };
  }
}
