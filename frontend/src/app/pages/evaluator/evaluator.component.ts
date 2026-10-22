import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  WeightVector,
  EvaluationResponse,
  RankedProduct,
  SourceListing,
  SourceSearchResponse,
} from '../../models/product.model';

type ContextProfile = 'economia' | 'equilibrado' | 'valoraciones' | 'personalizado';

@Component({
  selector: 'app-evaluator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="evaluator-container">
      <h2>Evaluador Multicriterio</h2>
      <p class="subtitle">Ajusta la importancia de cada criterio para obtener una recomendación:</p>

      <div class="card source-card">
        <h3>Comparar una muestra web</h3>
        <p class="source-disclaimer">
          DummyJSON es una API de datos de ejemplo para prototipos. Sus precios, valoraciones y
          disponibilidad no representan el mercado real.
        </p>
        <label for="source-query">Buscar en el catálogo de demostración</label>
        <div class="source-controls">
          <input
            id="source-query"
            type="search"
            maxlength="80"
            [(ngModel)]="sourceQuery"
            placeholder="Por ejemplo: laptop"
            [disabled]="sourceLoading"
          />
          <button
            class="btn"
            (click)="searchSource()"
            [disabled]="sourceLoading || loading || sourceQuery.trim().length < 2"
          >
            {{ sourceLoading ? 'Consultando...' : 'Consultar fuente' }}
          </button>
          <button class="btn btn-secondary" (click)="useLocalCatalog()" [disabled]="sourceLoading">
            Usar catálogo local
          </button>
        </div>
        @if (sourceMessage) {
          <p class="source-message" aria-live="polite">{{ sourceMessage }}</p>
        }
        @if (activeSourceRun) {
          <div class="source-metadata" aria-live="polite">
            <b>Fuente activa:</b> DummyJSON · corrida {{ activeSourceRun.run_id }}<br />
            <b>Consulta:</b> {{ activeSourceRun.query }} · <b>Obtenida:</b>
            {{ activeSourceRun.retrieved_at | date: 'medium' }}<br />
            <b>Registros:</b> {{ activeSourceRun.metrics.accepted }} válidos de
            {{ activeSourceRun.metrics.received }} ·
            {{ activeSourceRun.metrics.duplicates }} duplicados ·
            {{ activeSourceRun.metrics.rejected }} rechazados
            @if (activeSourceRun.duration_ms != null) {
              <br /><b>Duración de la consulta:</b> {{ activeSourceRun.duration_ms }} ms
            }
            <p>
              La API no declara moneda ni ofrece ofertas reales; el precio se conserva como valor de
              muestra.
            </p>
          </div>
        }
      </div>

      <!-- Panel de Ponderaciones -->
      <div class="card">
        <h3>Criterios de Ponderación</h3>
        <label for="context-profile">Prioridad de esta comparación</label>
        <select
          id="context-profile"
          [ngModel]="contextProfile"
          (ngModelChange)="onContextChange($event)"
          [disabled]="loading || sourceLoading"
        >
          <option value="economia">Ahorro</option>
          <option value="equilibrado">Equilibrio</option>
          <option value="valoraciones">Valoraciones</option>
          <option value="personalizado">Personalizado</option>
        </select>
        <p class="profile-description">{{ profileDescription }}</p>
        <div class="sliders-list">
          <div class="slider-item">
            <div class="slider-header">
              <span id="price-weight-label">Precio (Ahorro):</span>
              <b>{{ getPercent(weights.weight_price) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_price * 100"
              (ngModelChange)="onSliderPreview('weight_price', $event)"
              (change)="evaluate()"
              [attr.aria-labelledby]="'price-weight-label'"
              [attr.aria-valuetext]="getPercent(weights.weight_price) + '%'"
              [disabled]="loading || sourceLoading"
            />
          </div>

          <div class="slider-item">
            <div class="slider-header">
              <span id="quality-weight-label">Calidad (Opiniones):</span>
              <b>{{ getPercent(weights.weight_quality) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_quality * 100"
              (ngModelChange)="onSliderPreview('weight_quality', $event)"
              (change)="evaluate()"
              [attr.aria-labelledby]="'quality-weight-label'"
              [attr.aria-valuetext]="getPercent(weights.weight_quality) + '%'"
              [disabled]="loading || sourceLoading"
            />
          </div>

          <div class="slider-item">
            <div class="slider-header">
              <span id="stock-weight-label">Disponibilidad de Stock:</span>
              <b>{{ getPercent(weights.weight_stock) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_stock * 100"
              (ngModelChange)="onSliderPreview('weight_stock', $event)"
              (change)="evaluate()"
              [attr.aria-labelledby]="'stock-weight-label'"
              [attr.aria-valuetext]="getPercent(weights.weight_stock) + '%'"
              [disabled]="loading || sourceLoading"
            />
          </div>

          <div class="slider-item">
            <div class="slider-header">
              <span id="specs-weight-label">Especificaciones Técnicas:</span>
              <b>{{ getPercent(weights.weight_specs) }}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [ngModel]="weights.weight_specs * 100"
              (ngModelChange)="onSliderPreview('weight_specs', $event)"
              (change)="evaluate()"
              [attr.aria-labelledby]="'specs-weight-label'"
              [attr.aria-valuetext]="getPercent(weights.weight_specs) + '%'"
              [disabled]="loading || sourceLoading"
            />
          </div>
        </div>

        <div class="btn-container">
          <button
            class="btn"
            (click)="evaluate()"
            [disabled]="
              loading || (activeSourceRun !== null && activeSourceRun.metrics.accepted < 2)
            "
          >
            {{ loading ? 'Calculando...' : 'Calcular ranking' }}
          </button>
        </div>
      </div>

      <!-- Resultado Destacado -->
      @if (evaluation && topProduct) {
        <div class="card winner-card">
          <div class="winner-title-row">
            <h4>
              {{ activeSourceRun ? 'Primera opción de la muestra:' : 'Producto recomendado:' }}
              {{ topProduct.name }}
            </h4>
            <span class="badge" [ngClass]="getLevelClass(topProduct.level)">{{
              topProduct.level
            }}</span>
          </div>
          <p class="winner-details">
            <b>Puntaje final:</b> {{ topProduct.final_score }} / 100 |
            <b>Precio{{ activeSourceRun ? ' de muestra' : '' }}:</b>
            {{ formatProductPrice(topProduct) }} | <b>Marca:</b> {{ topProduct.brand }}
          </p>
          <div class="explanation-box"><b>Explicación:</b> {{ evaluation.global_explanation }}</div>

          @if (evaluation.warnings.length > 0) {
            <div class="warnings-box">
              @for (w of evaluation.warnings; track w) {
                <p>Aviso: {{ w }}</p>
              }
            </div>
          }
          @if (evaluation.active_criteria?.length) {
            <p class="criteria-note">
              Criterios usados: {{ formatCriteria(evaluation.active_criteria) }}.
              @if (evaluation.ignored_criteria?.length) {
                Se omitieron: {{ formatCriteria(evaluation.ignored_criteria) }} por falta de datos
                comparables.
              }
            </p>
          }
          @if (evaluation.effective_weights) {
            <p class="criteria-note">
              Pesos efectivos: precio {{ getPercent(evaluation.effective_weights.weight_price) }}% ·
              valoración {{ getPercent(evaluation.effective_weights.weight_quality) }}% ·
              disponibilidad {{ getPercent(evaluation.effective_weights.weight_stock) }}% ·
              especificaciones {{ getPercent(evaluation.effective_weights.weight_specs) }}%.
            </p>
          }
        </div>

        <!-- Tabla o Lista de Ranking -->
        <div class="card">
          <h3>Ranking de Productos</h3>
          <div class="table-wrapper">
            <table class="ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>{{ activeSourceRun ? 'Valoración de muestra' : 'Calidad' }}</th>
                  <th>{{ activeSourceRun ? 'Disponibilidad de muestra' : 'Stock' }}</th>
                  <th>Specs</th>
                  <th>Puntuación</th>
                  <th>Nivel</th>
                  @if (activeSourceRun) {
                    <th>Procedencia</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (item of evaluation.ranking; track item.id) {
                  <tr [class.highlight-row]="item.rank_position === 1">
                    <td>
                      <b>{{ item.rank_position }}</b>
                    </td>
                    <td>{{ item.name }} ({{ item.brand }})</td>
                    <td>{{ formatProductPrice(item) }}</td>
                    <td>
                      {{
                        item.quality_rating != null ? item.quality_rating + ' / 5' : 'No disponible'
                      }}
                    </td>
                    <td>{{ item.stock != null ? item.stock : 'No disponible' }}</td>
                    <td>
                      {{ item.specs_score != null ? item.specs_score + ' / 100' : 'No disponible' }}
                    </td>
                    <td>
                      <b>{{ item.final_score }}</b>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="getLevelClass(item.level)">
                        {{ item.level }}
                      </span>
                    </td>
                    @if (activeSourceRun) {
                      <td>
                        @if (getSourceListing(item.id); as sourceRecord) {
                          <a
                            [href]="sourceRecord.source_url"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            DummyJSON · {{ sourceRecord.external_id }}
                          </a>
                          <details>
                            <summary>Hash SHA-256</summary>
                            <code>{{ sourceRecord.content_hash }}</code>
                          </details>
                        } @else {
                          <span>Sin enlace</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .evaluator-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .subtitle {
        color: #64748b;
        margin-bottom: 0.5rem;
      }

      .source-card {
        border-left: 4px solid #0f766e;
      }

      .source-disclaimer,
      .profile-description,
      .criteria-note {
        color: #475569;
        font-size: 0.88rem;
      }

      .source-card label,
      .card > label {
        display: block;
        font-weight: 600;
        margin: 0.5rem 0;
      }

      .source-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }

      .source-controls input,
      select {
        min-height: 2.5rem;
        padding: 0.45rem 0.65rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font: inherit;
      }

      .source-controls input {
        flex: 1 1 180px;
      }

      .source-message {
        margin-top: 0.5rem;
        color: #92400e;
      }

      .source-metadata {
        margin-top: 0.75rem;
        padding: 0.75rem;
        background: #f0fdfa;
        border-radius: 6px;
        font-size: 0.85rem;
        overflow-wrap: anywhere;
      }

      .source-metadata p {
        margin: 0.5rem 0 0;
      }

      .btn-secondary {
        background: #475569;
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

      .table-wrapper {
        overflow-x: auto;
      }

      .ranking-table {
        width: 100%;
        min-width: 720px;
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
    `,
  ],
})
export class EvaluatorComponent implements OnInit {
  readonly profiles: Record<ContextProfile, { description: string; weights: WeightVector }> = {
    economia: {
      description:
        'Prioriza precio y disponibilidad; no infiere características que la fuente no entrega.',
      weights: { weight_price: 0.7, weight_quality: 0.1, weight_stock: 0.15, weight_specs: 0.05 },
    },
    equilibrado: {
      description:
        'Equilibra precio, valoración y disponibilidad con las ponderaciones definidas para el prototipo.',
      weights: { weight_price: 0.4, weight_quality: 0.3, weight_stock: 0.1, weight_specs: 0.2 },
    },
    valoraciones: {
      description:
        'Da más peso a la valoración disponible; en DummyJSON es un dato de demostración, no una reseña real.',
      weights: { weight_price: 0.15, weight_quality: 0.65, weight_stock: 0.1, weight_specs: 0.1 },
    },
    personalizado: {
      description:
        'Los deslizadores representan tus prioridades para esta consulta y no crean un perfil personal persistente.',
      weights: { weight_price: 0.4, weight_quality: 0.3, weight_stock: 0.1, weight_specs: 0.2 },
    },
  };

  weights: WeightVector = {
    weight_price: 0.4,
    weight_quality: 0.3,
    weight_stock: 0.1,
    weight_specs: 0.2,
  };

  evaluation: EvaluationResponse | null = null;
  loading: boolean = false;
  sourceLoading = false;
  sourceQuery = 'laptop';
  sourceMessage = '';
  contextProfile: ContextProfile = 'equilibrado';
  activeSourceRun: SourceSearchResponse | null = null;

  get profileDescription(): string {
    return this.profiles[this.contextProfile].description;
  }

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.evaluate();
  }

  get topProduct(): RankedProduct | null {
    return this.evaluation?.ranking?.[0] ?? null;
  }

  onSliderPreview(key: keyof WeightVector, value: number): void {
    this.contextProfile = 'personalizado';
    this.weights[key] = Math.round(value) / 100;
  }

  onContextChange(value: string): void {
    if (!Object.prototype.hasOwnProperty.call(this.profiles, value)) return;
    this.contextProfile = value as ContextProfile;
    this.weights = { ...this.profiles[this.contextProfile].weights };
    this.evaluate();
  }

  searchSource(): void {
    const query = this.sourceQuery.trim();
    if (query.length < 2 || this.sourceLoading) return;

    this.sourceLoading = true;
    this.sourceMessage = '';
    this.evaluation = null;
    this.apiService.searchDemoProducts(query, 10).subscribe({
      next: (run) => {
        this.activeSourceRun = run;
        this.sourceLoading = false;
        if (run.metrics.accepted < 2) {
          this.sourceMessage =
            'La consulta no devolvió al menos dos productos válidos para comparar.';
          return;
        }
        this.sourceMessage = '';
        this.evaluate();
      },
      error: (error: { name?: string; error?: { message?: string } }) => {
        this.activeSourceRun = null;
        this.sourceLoading = false;
        this.sourceMessage =
          error.name === 'TimeoutError'
            ? 'La consulta superó 20 segundos. Revisa los logs de backend y Python.'
            : (error.error?.message ?? 'No se pudo consultar la fuente de demostración.');
      },
    });
  }

  useLocalCatalog(): void {
    this.activeSourceRun = null;
    this.sourceMessage = 'Comparando el catálogo local de ejemplo.';
    this.evaluate();
  }

  evaluate(): void {
    this.loading = true;
    this.apiService
      .evaluateRanking(this.weights, this.contextProfile, this.activeSourceRun?.run_id)
      .subscribe({
        next: (res) => {
          this.evaluation = res;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.sourceMessage =
            'No se pudo evaluar esta muestra. No se sustituyó por el catálogo local.';
        },
      });
  }

  getPercent(val: number): number {
    return Math.round(val * 100);
  }

  formatMoney(amount: number): string {
    return '$' + amount.toLocaleString('es-CL');
  }

  formatProductPrice(product: RankedProduct): string {
    if (product.source === 'dummyjson') {
      return `${product.price.toLocaleString('es-CL', { maximumFractionDigits: 2 })} (u. de muestra)`;
    }
    return this.formatMoney(product.price);
  }

  formatCriteria(criteria: string[] | undefined): string {
    const labels: Record<string, string> = {
      price: 'precio',
      quality: 'valoración',
      stock: 'disponibilidad',
      specs: 'especificaciones',
    };
    return (criteria ?? []).map((criterion) => labels[criterion] ?? criterion).join(', ');
  }

  getSourceListing(productId: string): SourceListing | undefined {
    if (!productId.startsWith('dummyjson:')) return undefined;
    const externalId = productId.slice('dummyjson:'.length);
    return this.activeSourceRun?.products.find((product) => product.external_id === externalId);
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
