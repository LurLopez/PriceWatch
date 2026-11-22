import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getApiBaseUrl } from '../config/api.config';
import {
  Product,
  WeightVector,
  EvaluationResponse,
  RankedProduct,
  EvaluationHistoryItem,
  SourceSearchResponse,
} from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = getApiBaseUrl();

  // Modo mock desactivado: consume API real con fallback en caso de error
  public mockMode = false;

  private localHistory: EvaluationHistoryItem[] = [];

  constructor(private readonly http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    if (this.mockMode) {
      return of(this.getFallbackProducts());
    }

    return this.http
      .get<Product[]>(`${this.baseUrl}/products`)
      .pipe(catchError(() => of(this.getFallbackProducts())));
  }

  searchDemoProducts(
    query: string,
    limit = 10,
    category?: string,
  ): Observable<SourceSearchResponse> {
    return this.http
      .post<SourceSearchResponse>(`${this.baseUrl}/sources/demo-products/search`, {
        query,
        ...(category ? { category } : {}),
        limit,
        acknowledged: true,
      })
      .pipe(timeout({ first: 20_000 }));
  }

  evaluateRanking(
    weights: WeightVector,
    contextProfile = 'personalizado',
    sourceRunId?: string,
  ): Observable<EvaluationResponse> {
    if (this.mockMode) {
      if (sourceRunId) {
        return throwError(() => new Error('La fuente externa no está disponible en modo local.'));
      }
      const res = this.computeLocalRanking(weights, contextProfile);
      this.saveToLocalHistory(weights, res);
      return of(res);
    }

    return this.http
      .post<EvaluationResponse>(`${this.baseUrl}/ranking/evaluate`, {
        weights,
        context_profile: contextProfile,
        ...(sourceRunId ? { source_run_id: sourceRunId } : {}),
      })
      .pipe(
        catchError((error: unknown) => {
          if (this.isAuthError(error)) return throwError(() => error);
          if (sourceRunId) return throwError(() => error);
          const res = this.computeLocalRanking(weights, contextProfile);
          this.saveToLocalHistory(weights, res);
          return of(res);
        }),
      );
  }

  getHistory(): Observable<EvaluationHistoryItem[]> {
    if (this.mockMode) {
      return of(this.localHistory);
    }

    return this.http.get<EvaluationHistoryItem[]>(`${this.baseUrl}/ranking/history`).pipe(
      catchError((error: unknown) => {
        if (this.isAuthError(error)) return throwError(() => error);
        return of(this.localHistory);
      }),
    );
  }

  private isAuthError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
  }

  private saveToLocalHistory(weights: WeightVector, response: EvaluationResponse): void {
    if (response.ranking.length === 0) return;
    const top = response.ranking[0];
    const item: EvaluationHistoryItem = {
      id: `hist-${Date.now()}`,
      weight_price: weights.weight_price,
      weight_quality: weights.weight_quality,
      weight_stock: weights.weight_stock,
      weight_specs: weights.weight_specs,
      top_product_id: top.id,
      top_product_name: top.name,
      top_product_score: top.final_score,
      explanation: response.global_explanation,
      context_profile: response.context_profile,
      source_run_id: response.source_run_id,
      evaluated_at: new Date().toISOString(),
    };
    this.localHistory.unshift(item);
  }

  getFallbackProducts(): Product[] {
    return [
      {
        id: 'prod-001',
        name: 'ThinkPad Pro X1 Gen 10',
        category: 'Laptops',
        brand: 'Lenovo',
        price: 1250,
        quality_rating: 4.8,
        stock: 8,
        specs_score: 92,
        image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400',
        description: 'Portátil profesional con chasis de fibra de carbono.',
      },
      {
        id: 'prod-002',
        name: 'MacBook Air M2',
        category: 'Laptops',
        brand: 'Apple',
        price: 1099,
        quality_rating: 4.9,
        stock: 5,
        specs_score: 90,
        image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
        description: 'Diseño ultrafino con chip M2 y alta autonomía.',
      },
      {
        id: 'prod-003',
        name: 'Acer Aspire 3',
        category: 'Laptops',
        brand: 'Acer',
        price: 389,
        quality_rating: 3.9,
        stock: 25,
        specs_score: 64,
        image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
        description: 'Portátil de entrada ideal para oficina y estudio.',
      },
      {
        id: 'prod-004',
        name: 'ASUS ROG Strix G16',
        category: 'Laptops',
        brand: 'ASUS',
        price: 1699,
        quality_rating: 4.7,
        stock: 4,
        specs_score: 96,
        image_url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400',
        description: 'Portátil de alto rendimiento gráfico.',
      },
      {
        id: 'prod-005',
        name: 'HP Pavilion 15',
        category: 'Laptops',
        brand: 'HP',
        price: 649,
        quality_rating: 4.3,
        stock: 14,
        specs_score: 79,
        image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        description: 'Portátil de uso general con buen equilibrio precio-calidad.',
      },
    ];
  }

  private computeLocalRanking(
    weights: WeightVector,
    contextProfile = 'personalizado',
  ): EvaluationResponse {
    const products = this.getFallbackProducts();
    const sum =
      weights.weight_price + weights.weight_quality + weights.weight_stock + weights.weight_specs ||
      1;
    const wp = weights.weight_price / sum;
    const wq = weights.weight_quality / sum;
    const ws = weights.weight_stock / sum;
    const we = weights.weight_specs / sum;

    const prices = products.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const stocks = products.map((p) => p.stock ?? 0);
    const minStock = Math.min(...stocks);
    const maxStock = Math.max(...stocks);
    const stockRange = maxStock - minStock || 1;

    const ranked: RankedProduct[] = products.map((p) => {
      const normPrice = (maxPrice - p.price) / priceRange;
      const normQuality = ((p.quality_rating ?? 1) - 1) / 4;
      const normStock = ((p.stock ?? 0) - minStock) / stockRange;
      const normSpecs = (p.specs_score ?? 0) / 100;

      const score =
        Math.round((normPrice * wp + normQuality * wq + normStock * ws + normSpecs * we) * 10000) /
        100;

      let level = 'No Favorable';
      if (score >= 80) level = 'Altamente Recomendado';
      else if (score >= 60) level = 'Recomendado';
      else if (score >= 40) level = 'Aceptable';

      return {
        ...p,
        rank_position: 1,
        final_score: score,
        level,
        breakdown: {
          normalized_price: Math.round(normPrice * 100) / 100,
          normalized_quality: Math.round(normQuality * 100) / 100,
          normalized_stock: Math.round(normStock * 100) / 100,
          normalized_specs: Math.round(normSpecs * 100) / 100,
          weighted_price_contribution: Math.round(normPrice * wp * 10000) / 100,
          weighted_quality_contribution: Math.round(normQuality * wq * 10000) / 100,
          weighted_stock_contribution: Math.round(normStock * ws * 10000) / 100,
          weighted_specs_contribution: Math.round(normSpecs * we * 10000) / 100,
        },
        reasons: [`Puntaje de ${score}/100 según ponderaciones`],
      };
    });

    ranked.sort((a, b) => b.final_score - a.final_score);
    ranked.forEach((item, index) => {
      item.rank_position = index + 1;
    });

    const top = ranked[0];
    const warnings: string[] = [];
    if (top && (top.stock ?? 0) < 5) {
      warnings.push(`Stock bajo: quedan ${top.stock} unidades de ${top.name}.`);
    }

    return {
      status: 'success_local',
      total_products_evaluated: ranked.length,
      top_recommended_product_id: top ? top.id : '',
      global_explanation: top
        ? `El producto '${top.name}' obtiene el primer lugar con ${top.final_score} puntos según tus prioridades.`
        : 'Sin productos para evaluar.',
      warnings,
      ranking: ranked,
      context_profile: contextProfile,
      active_criteria: ['price', 'quality', 'stock', 'specs'],
      ignored_criteria: [],
      effective_weights: {
        weight_price: wp,
        weight_quality: wq,
        weight_stock: ws,
        weight_specs: we,
      },
      source_run_id: null,
    };
  }
}
