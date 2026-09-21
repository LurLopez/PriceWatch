import { Injectable } from '@nestjs/common';
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
    this.pythonUrl = this.configService.get<string>('PYTHON_SERVICE_URL') || 'http://localhost:8000';
  }

  async evaluate(weights: WeightsDto, category?: string) {
    const products = await this.productsService.findAll(category);

    let result;
    try {
      // 1. Intentar evaluar con FastAPI
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pythonUrl}/evaluate`,
          { weights, products },
          { timeout: 4000 },
        ),
      );
      result = response.data;
    } catch {
      // 2. Si FastAPI falla, aplicar degradación elegante local (success_fallback)
      result = this.computeFallbackRanking(weights, products);
    }

    // 3. Persistir en la base de datos (ranking_history)
    try {
      if (result.ranking && result.ranking.length > 0) {
        const top = result.ranking[0];
        await this.prisma.rankingHistory.create({
          data: {
            weightPrice: weights.weight_price,
            weightQuality: weights.weight_quality,
            weightStock: weights.weight_stock,
            weightSpecs: weights.weight_specs,
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

  async getHistory() {
    try {
      const history = await this.prisma.rankingHistory.findMany({
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
        evaluated_at: item.evaluatedAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  private computeFallbackRanking(weights: WeightsDto, products: any[]) {
    const sum = weights.weight_price + weights.weight_quality + weights.weight_stock + weights.weight_specs || 1;
    const wp = weights.weight_price / sum;
    const wq = weights.weight_quality / sum;
    const ws = weights.weight_stock / sum;
    const we = weights.weight_specs / sum;

    const prices = products.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP || 1;

    const stocks = products.map((p) => p.stock);
    const minS = Math.min(...stocks);
    const maxS = Math.max(...stocks);
    const sRange = maxS - minS || 1;

    const ranked = products.map((p) => {
      const normP = (maxP - p.price) / pRange;
      const normQ = (p.qualityRating - 1) / 4;
      const normS = (p.stock - minS) / sRange;
      const normE = p.specsScore / 100;

      const score = Math.round((normP * wp + normQ * wq + normS * ws + normE * we) * 10000) / 100;

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
        quality_rating: p.qualityRating,
        stock: p.stock,
        specs_score: p.specsScore,
        image_url: p.imageUrl,
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
    return {
      status: 'success_fallback',
      total_products_evaluated: ranked.length,
      top_recommended_product_id: top ? top.id : '',
      global_explanation: top
        ? `El producto '${top.name}' lidera con ${top.final_score} puntos (cálculo de contingencia NestJS).`
        : 'Sin productos.',
      warnings: ['Aviso: evaluación procesada en modo contingencia (FastAPI no disponible).'],
      ranking: ranked,
    };
  }
}
