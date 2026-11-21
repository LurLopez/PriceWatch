import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma.service';
import { ProductsService } from '../products/products.service';
import { WeightsDto } from './dto/evaluate-ranking.dto';

@Injectable()
export class RankingService {
  private readonly pythonUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.pythonUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:8000';
  }

  async evaluate(
    weights?: WeightsDto,
    category?: string,
    contextProfile: string = 'personalizado',
    sourceRunId?: string,
    userId?: string,
  ) {
    const requestWeights = weights ?? {
      weight_price: 0.4,
      weight_quality: 0.3,
      weight_stock: 0.1,
      weight_specs: 0.2,
    };
    const products = sourceRunId
      ? await this.findSourceProducts(sourceRunId)
      : await this.productsService.findAll(category);
    const evaluationProducts = products.map((product) =>
      this.toEvaluatorProduct(product),
    );

    let result;
    try {
      // 1. Intentar evaluar con FastAPI
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pythonUrl}/evaluate`,
          {
            weights: requestWeights,
            products: evaluationProducts,
            context_profile: contextProfile,
            source_run_id: sourceRunId,
          },
          { timeout: 4000 },
        ),
      );
      result = response.data;
    } catch {
      // 2. Si FastAPI falla, aplicar degradación elegante local (success_fallback)
      result = this.computeFallbackRanking(
        requestWeights,
        evaluationProducts,
        contextProfile,
        sourceRunId,
      );
    }

    // 3. Persistir en la base de datos (ranking_history)
    try {
      if (result.ranking && result.ranking.length > 0) {
        const top = result.ranking[0];
        await this.prisma.rankingHistory.create({
          data: {
            userId: userId ?? null,
            weightPrice:
              result.effective_weights?.weight_price ??
              requestWeights.weight_price,
            weightQuality:
              result.effective_weights?.weight_quality ??
              requestWeights.weight_quality,
            weightStock:
              result.effective_weights?.weight_stock ??
              requestWeights.weight_stock,
            weightSpecs:
              result.effective_weights?.weight_specs ??
              requestWeights.weight_specs,
            contextProfile,
            sourceRunId: sourceRunId ?? null,
            topProductId: top.id,
            topProductName: top.name,
            topProductScore: top.final_score,
            explanation: result.global_explanation,
          },
        });
      }
    } catch {
      // No bloquear la respuesta si la base de datos no estuviera disponible
    }

    return result;
  }

  async getHistory(userId?: string, isAdmin = false) {
    try {
      const history = await this.prisma.rankingHistory.findMany({
        where: userId && !isAdmin ? { userId } : undefined,
        orderBy: { evaluatedAt: 'desc' },
        take: 20,
      });

      return history.map((item) => ({
        id: item.id,
        weight_price: item.weightPrice,
        weight_quality: item.weightQuality,
        weight_stock: item.weightStock,
        weight_specs: item.weightSpecs,
        top_product_id: item.topProductId,
        top_product_name: item.topProductName,
        top_product_score: item.topProductScore,
        explanation: item.explanation,
        context_profile: item.contextProfile,
        source_run_id: item.sourceRunId,
        evaluated_at: item.evaluatedAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  private async findSourceProducts(sourceRunId: string) {
    const run = await this.prisma.sourceRun.findUnique({
      where: { id: sourceRunId },
      include: { listings: { orderBy: { title: 'asc' } } },
    });
    if (!run || run.source !== 'dummyjson') {
      throw new NotFoundException(
        'No se encontró la corrida de fuente solicitada.',
      );
    }
    if (run.status !== 'SUCCEEDED') {
      throw new BadRequestException(
        'La corrida de fuente no terminó correctamente.',
      );
    }
    if (run.listings.length < 2) {
      throw new BadRequestException(
        'Se necesitan al menos dos productos válidos para comparar la muestra.',
      );
    }
    return run.listings;
  }

  private toEvaluatorProduct(product: any) {
    return {
      id: product.externalId ? `dummyjson:${product.externalId}` : product.id,
      name: product.name ?? product.title,
      category: product.category ?? 'Sin categoría',
      brand: product.brand ?? 'Sin marca',
      price: product.price,
      quality_rating:
        product.quality_rating ??
        product.qualityRating ??
        product.rating ??
        null,
      stock: product.stock ?? product.availabilityReference ?? null,
      specs_score: product.specs_score ?? product.specsScore ?? null,
      image_url: product.image_url ?? product.imageUrl ?? null,
      description: product.description ?? null,
      source: product.source ?? (product.externalId ? 'dummyjson' : null),
      source_url: product.source_url ?? product.sourceUrl ?? null,
      currency: product.currency ?? null,
    };
  }

  private computeFallbackRanking(
    weights: WeightsDto,
    products: any[],
    contextProfile: string,
    sourceRunId?: string,
  ) {
    const profiles: Record<string, WeightsDto> = {
      economia: {
        weight_price: 0.7,
        weight_quality: 0.1,
        weight_stock: 0.15,
        weight_specs: 0.05,
      },
      equilibrado: {
        weight_price: 0.4,
        weight_quality: 0.3,
        weight_stock: 0.1,
        weight_specs: 0.2,
      },
      valoraciones: {
        weight_price: 0.15,
        weight_quality: 0.65,
        weight_stock: 0.1,
        weight_specs: 0.1,
      },
    };
    const selectedWeights =
      contextProfile === 'personalizado'
        ? weights
        : (profiles[contextProfile] ?? profiles.equilibrado);

    const values: Record<string, Array<number | null | undefined>> = {
      price: products.map((product) => product.price),
      quality: products.map((product) => product.quality_rating),
      stock: products.map((product) => product.stock),
      specs: products.map((product) => product.specs_score),
    };
    const activeCriteria = Object.entries(values)
      .filter(([, criterionValues]) =>
        criterionValues.every((value) => value !== null && value !== undefined),
      )
      .map(([criterion]) => criterion);
    const ignoredCriteria = Object.keys(values).filter(
      (criterion) => !activeCriteria.includes(criterion),
    );
    const criterionWeights: Record<string, number> = {
      price: selectedWeights.weight_price,
      quality: selectedWeights.weight_quality,
      stock: selectedWeights.weight_stock,
      specs: selectedWeights.weight_specs,
    };
    const activeWeightSum = activeCriteria.reduce(
      (sum, criterion) => sum + criterionWeights[criterion],
      0,
    );
    if (activeWeightSum <= 0) {
      throw new BadRequestException(
        'El perfil no asigna peso positivo a ningún criterio disponible.',
      );
    }
    const effectiveWeights = Object.fromEntries(
      Object.entries(criterionWeights).map(([criterion, weight]) => [
        criterion,
        activeCriteria.includes(criterion) ? weight / activeWeightSum : 0,
      ]),
    );
    const wp = effectiveWeights.price;
    const wq = effectiveWeights.quality;
    const ws = effectiveWeights.stock;
    const we = effectiveWeights.specs;

    const prices = products.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP;

    const stocks = products
      .map((p) => p.stock)
      .filter((value) => value !== null && value !== undefined);
    const minS = Math.min(...stocks);
    const maxS = Math.max(...stocks);
    const sRange = maxS - minS;

    const ranked = products.map((p) => {
      const normP = pRange === 0 ? 1 : (maxP - p.price) / pRange;
      const normQ =
        p.quality_rating === null ||
        p.quality_rating === undefined ||
        !activeCriteria.includes('quality')
          ? 0
          : Math.max(0, Math.min(1, (p.quality_rating - 1) / 4));
      const normS =
        p.stock === null ||
        p.stock === undefined ||
        !activeCriteria.includes('stock')
          ? 0
          : sRange === 0
            ? p.stock > 0
              ? 1
              : 0
            : (p.stock - minS) / sRange;
      const normE =
        p.specs_score === null ||
        p.specs_score === undefined ||
        !activeCriteria.includes('specs')
          ? 0
          : Math.max(0, Math.min(1, p.specs_score / 100));

      const score =
        Math.round(
          (normP * wp + normQ * wq + normS * ws + normE * we) * 10000,
        ) / 100;

      let level = 'No Favorable';
      if (score >= 80) level = 'Altamente Recomendado';
      else if (score >= 60) level = 'Recomendado';
      else if (score >= 40) level = 'Aceptable';

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        price: p.price,
        quality_rating: p.quality_rating,
        stock: p.stock,
        specs_score: p.specs_score,
        image_url: p.image_url,
        source: p.source,
        source_url: p.source_url,
        currency: p.currency,
        rank_position: 1,
        final_score: score,
        level,
        breakdown: {
          normalized_price: Math.round(normP * 100) / 100,
          normalized_quality: Math.round(normQ * 100) / 100,
          normalized_stock: Math.round(normS * 100) / 100,
          normalized_specs: Math.round(normE * 100) / 100,
          weighted_price_contribution: Math.round(normP * wp * 10000) / 100,
          weighted_quality_contribution: Math.round(normQ * wq * 10000) / 100,
          weighted_stock_contribution: Math.round(normS * ws * 10000) / 100,
          weighted_specs_contribution: Math.round(normE * we * 10000) / 100,
        },
      };
    });

    ranked.sort((a, b) => b.final_score - a.final_score);
    ranked.forEach((item, index) => {
      item.rank_position = index + 1;
    });

    const top = ranked[0];
    const criterionLabels: Record<string, string> = {
      price: 'precio',
      quality: 'valoración',
      stock: 'disponibilidad',
      specs: 'especificaciones',
    };
    return {
      status: 'success_fallback',
      total_products_evaluated: ranked.length,
      top_recommended_product_id: top ? top.id : '',
      global_explanation: top
        ? `El producto '${top.name}' lidera con ${top.final_score} puntos (cálculo de contingencia NestJS).`
        : 'Sin productos.',
      warnings: [
        'Aviso: evaluación procesada en modo contingencia (FastAPI no disponible).',
        ...(ignoredCriteria.length > 0
          ? [
              `Criterios omitidos por falta de datos: ${ignoredCriteria.map((criterion) => criterionLabels[criterion]).join(', ')}.`,
            ]
          : []),
        ...(sourceRunId
          ? ['La fuente contiene datos sintéticos de demostración.']
          : []),
      ],
      ranking: ranked,
      context_profile: contextProfile,
      active_criteria: activeCriteria,
      ignored_criteria: ignoredCriteria,
      effective_weights: {
        weight_price: effectiveWeights.price,
        weight_quality: effectiveWeights.quality,
        weight_stock: effectiveWeights.stock,
        weight_specs: effectiveWeights.specs,
      },
      source_run_id: sourceRunId ?? null,
    };
  }
}
