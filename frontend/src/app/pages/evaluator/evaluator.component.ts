import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  WeightVector,
  EvaluationResponse,
  RankedProduct,
} from '../../models/product.model';

@Component({
  selector: 'app-evaluator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="evaluator-container">
      <h2>Evaluador Multicriterio</h2>
      <p class="subtitle">Ajusta la importancia de cada criterio para obtener una recomendación:</p>

      <!-- Panel de Ponderaciones -->
      <div class="card">
        <h3>Criterios de Ponderación</h3>
        <div class="sliders-list">
          <div class="slider-item">
            <div class="slider-header">
              <span>Precio (Ahorro):</span>
              <b>{{ getPercent(weights.weight_price) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_price * 100"
              (ngModelChange)="onSliderChange('weight_price', $event)"
            />
          </div>

          <div class="slider-item">
            <div class="slider-header">
              <span>Calidad (Opiniones):</span>
              <b>{{ getPercent(weights.weight_quality) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_quality * 100"
              (ngModelChange)="onSliderChange('weight_quality', $event)"
            />
          </div>

          <div class="slider-item">
            <div class="slider-header">
              <span>Disponibilidad de Stock:</span>
              <b>{{ getPercent(weights.weight_stock) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_stock * 100"
              (ngModelChange)="onSliderChange('weight_stock', $event)"
            />
          </div>

          <div class="slider-item">
            <div class="slider-header">
              <span>Especificaciones Técnicas:</span>
              <b>{{ getPercent(weights.weight_specs) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_specs * 100"
              (ngModelChange)="onSliderChange('weight_specs', $event)"
            />
          </div>
        </div>

        <div class="btn-container">
          <button class="btn" (click)="evaluate()" [disabled]="loading">
            {{ loading ? 'Calculando...' : 'Calcular ranking' }}
          </button>
        </div>
      </div>

      <!-- Resultado Destacado -->
      @if (evaluation && topProduct) {
        <div class="card winner-card">
          <div class="winner-title-row">
            <h4>Producto recomendado: {{ topProduct.name }}</h4>
            <span class="badge" [ngClass]="getLevelClass(topProduct.level)">{{ topProduct.level }}</span>
          </div>
          <p class="winner-details">
            <b>Puntaje final:</b> {{ topProduct.final_score }} / 100 | 
            <b>Precio:</b> {{ formatMoney(topProduct.price) }} | 
            <b>Marca:</b> {{ topProduct.brand }}
          </p>
          <div class="explanation-box">
            <b>Explicación:</b> {{ evaluation.global_explanation }}
          </div>

          @if (evaluation.warnings.length > 0) {
            <div class="warnings-box">
              @for (w of evaluation.warnings; track w) {
                <p>Aviso: {{ w }}</p>
              }
            </div>
          }
        </div>

        <!-- Tabla o Lista de Ranking -->
        <div class="card">
          <h3>Ranking de Productos</h3>
          <table class="ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Precio</th>
                <th>Calidad</th>
                <th>Stock</th>
                <th>Specs</th>
                <th>Puntuación</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              @for (item of evaluation.ranking; track item.id) {
                <tr [class.highlight-row]="item.rank_position === 1">
                  <td><b>{{ item.rank_position }}</b></td>
                  <td>{{ item.name }} ({{ item.brand }})</td>
                  <td>{{ formatMoney(item.price) }}</td>
                  <td>{{ item.quality_rating }} / 5</td>
                  <td>{{ item.stock }}</td>
                  <td>{{ item.specs_score }}/100</td>
                  <td><b>{{ item.final_score }}</b></td>
                  <td>
                    <span class="badge" [ngClass]="getLevelClass(item.level)">
                      {{ item.level }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .evaluator-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .subtitle {
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .sliders-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 1rem 0;
    }

    @media (max-width: 600px) {
      .sliders-list {
        grid-template-columns: 1fr;
      }
    }

    .slider-item {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .slider-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
    }

    input[type='range'] {
      width: 100%;
      cursor: pointer;
    }

    .btn-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .winner-card {
      border-left: 4px solid #2563eb;
      background: #f8fafc;
    }

    .winner-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .winner-details {
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }

    .explanation-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #334155;
    }

    .warnings-box {
      margin-top: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #fef9c3;
      border-radius: 4px;
      font-size: 0.85rem;
      color: #854d0e;
    }

    .ranking-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.75rem;
      font-size: 0.9rem;
    }

    .ranking-table th,
    .ranking-table td {
      padding: 0.6rem 0.5rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .ranking-table th {
      color: #64748b;
      font-weight: 600;
      background: #f8fafc;
    }

    .highlight-row {
      background: #eff6ff;
    }
  `]
})
export class EvaluatorComponent implements OnInit {
  weights: WeightVector = {
    weight_price: 0.40,
    weight_quality: 0.30,
    weight_stock: 0.10,
    weight_specs: 0.20,
  };

  evaluation: EvaluationResponse | null = null;
  loading: boolean = false;

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.evaluate();
  }

  get topProduct(): RankedProduct | null {
    return this.evaluation?.ranking?.[0] ?? null;
  }

  onSliderChange(key: keyof WeightVector, value: number): void {
    this.weights[key] = Math.round(value) / 100;
    this.evaluate();
  }

  evaluate(): void {
    this.loading = true;
    this.apiService.evaluateRanking(this.weights).subscribe({
      next: (res) => {
        this.evaluation = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  getPercent(val: number): number {
    return Math.round(val * 100);
  }

  formatMoney(amount: number): string {
    return '$' + amount.toLocaleString('es-CL');
  }

  getLevelClass(level: string): string {
    switch (level) {
      case 'Altamente Recomendado':
        return 'badge-green';
      case 'Recomendado':
        return 'badge-blue';
      case 'Aceptable':
        return 'badge-yellow';
      default:
        return 'badge-gray';
    }
  }
}
