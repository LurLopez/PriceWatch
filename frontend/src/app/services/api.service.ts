import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Product,
  WeightVector,
  EvaluationResponse,
  RankedProduct,
  EvaluationHistoryItem,
} from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = '/api';

  // Modo mock desactivado: consume API real con fallback en caso de error
  public mockMode = false;

  private localHistory: EvaluationHistoryItem[] = [
    {
      id: 'hist-1',
      weight_price: 0.4,
      weight_quality: 0.3,
      weight_stock: 0.1,
      weight_specs: 0.2,
      top_product_id: 'prod-001',
      top_product_name: 'ThinkPad Pro X1',
      top_product_score: 86.4,
      explanation: 'El ThinkPad Pro X1 es la opción más equilibrada considerando el peso asignado a calidad y especificaciones.',
      evaluated_at: new Date().toISOString(),
    },
  ];

  constructor(private readonly http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    if (this.mockMode) {
      return of(this.getFallbackProducts());
    }

    return this.http.get<Product[]>(`${this.baseUrl}/products`).pipe(
      catchError(() => of(this.getFallbackProducts())),
    );
  }

  evaluateRanking(weights: WeightVector): Observable<EvaluationResponse> {
    if (this.mockMode) {
      const res = this.computeLocalRanking(weights);
      this.saveToLocalHistory(weights, res);
      return of(res);
    }

    return this.http.post<EvaluationResponse>(`${this.baseUrl}/ranking/evaluate`, { weights }).pipe(
      catchError(() => {
        const res = this.computeLocalRanking(weights);
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
      catchError(() => of(this.localHistory)),
    );
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

  private computeLocalRanking(weights: WeightVector): EvaluationResponse {
    const products = this.getFallbackProducts();
    const sum = weights.weight_price + weights.weight_quality + weights.weight_stock + weights.weight_specs || 1;
    const wp = weights.weight_price / sum;
    const wq = weights.weight_quality / sum;
    const ws = weights.weight_stock / sum;
    const we = weights.weight_specs / sum;

    const prices = products.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const stocks = products.map((p) => p.stock);
    const minStock = Math.min(...stocks);
    const maxStock = Math.max(...stocks);
    const stockRange = maxStock - minStock || 1;

    const ranked: RankedProduct[] = products.map((p) => {
      const normPrice = (maxPrice - p.price) / priceRange;
      const normQuality = (p.quality_rating - 1) / 4;
      const normStock = (p.stock - minStock) / stockRange;
      const normSpecs = p.specs_score / 100;

      const score = Math.round((normPrice * wp + normQuality * wq + normStock * ws + normSpecs * we) * 10000) / 100;

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
    if (top && top.stock < 5) {
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
    };
  }
}
