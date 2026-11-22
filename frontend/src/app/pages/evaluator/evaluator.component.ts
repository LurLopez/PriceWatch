import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonNote,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular';
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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonBadge,
    IonButton,
    IonNote,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonSpinner,
  ],
  template: `
    <div class="evaluator-container">
      <form [formGroup]="evaluatorForm">
        <h2>Evaluador Multicriterio</h2>
        <p class="subtitle">
          Ajusta la importancia de cada criterio para obtener una recomendación:
        </p>

        <div class="card source-card">
          <h3>Comparar una muestra web</h3>
          <p class="source-disclaimer">
            DummyJSON es una API de datos de ejemplo para prototipos. Sus precios, valoraciones y
            disponibilidad no representan el mercado real.
          </p>
          <ion-select
            id="source-category"
            fill="outline"
            formControlName="sourceCategory"
            label="Categoría de la muestra"
            labelPlacement="stacked"
            interface="popover"
            [disabled]="sourceLoading"
          >
            @for (category of sourceCategories; track category.slug) {
              <ion-select-option [value]="category.slug">{{ category.label }}</ion-select-option>
            }
          </ion-select>
          <div class="source-controls">
            <ion-button
              type="button"
              size="small"
              (click)="searchSource()"
              [disabled]="sourceLoading || loading || !sourceCategoryControl.value"
            >
              @if (sourceLoading) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
              }
              {{ sourceLoading ? 'Consultando...' : 'Consultar fuente' }}
            </ion-button>
            <ion-button
              type="button"
              size="small"
              color="medium"
              fill="outline"
              (click)="useLocalCatalog()"
              [disabled]="sourceLoading"
            >
              Usar catálogo local
            </ion-button>
          </div>
          @if (sourceMessage) {
            <ion-note color="warning" class="source-message" aria-live="polite">
              {{ sourceMessage }}
            </ion-note>
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
                La API no declara moneda ni ofrece ofertas reales; el precio se conserva como valor
                de muestra.
              </p>
            </div>
          }
        </div>

        <!-- Panel de Ponderaciones -->
        <div class="card">
          <h3>Criterios de Ponderación</h3>
          <ion-select
            id="context-profile"
            formControlName="contextProfile"
            fill="outline"
            label="Prioridad de esta comparación"
            labelPlacement="stacked"
            interface="popover"
            (ionChange)="onContextChange($event.detail.value)"
            [disabled]="loading || sourceLoading"
          >
            <ion-select-option value="economia">Ahorro</ion-select-option>
            <ion-select-option value="equilibrado">Equilibrio</ion-select-option>
            <ion-select-option value="valoraciones">Valoraciones</ion-select-option>
            <ion-select-option value="personalizado">Personalizado</ion-select-option>
          </ion-select>
          <p class="profile-description">{{ profileDescription }}</p>
          <div class="sliders-list">
            <div class="slider-item">
              <div class="slider-header">
                <span id="price-weight-label">Precio (Ahorro):</span>
                <b>{{ getPercent(weights.weight_price) }}%</b>
              </div>
              <ion-range
                formControlName="weight_price"
                min="0"
                max="100"
                step="5"
                aria-label="Peso del precio"
                [attr.aria-valuetext]="getPercent(weights.weight_price) + '%'"
                [disabled]="loading || sourceLoading"
                (ionChange)="onRangeChange('weight_price', $event.detail.value)"
              ></ion-range>
            </div>

            <div class="slider-item">
              <div class="slider-header">
                <span id="quality-weight-label">Calidad (Opiniones):</span>
                <b>{{ getPercent(weights.weight_quality) }}%</b>
              </div>
              <ion-range
                formControlName="weight_quality"
                min="0"
                max="100"
                step="5"
                aria-label="Peso de la calidad"
                [attr.aria-valuetext]="getPercent(weights.weight_quality) + '%'"
                [disabled]="loading || sourceLoading"
                (ionChange)="onRangeChange('weight_quality', $event.detail.value)"
              ></ion-range>
            </div>

            <div class="slider-item">
              <div class="slider-header">
                <span id="stock-weight-label">Disponibilidad de Stock:</span>
                <b>{{ getPercent(weights.weight_stock) }}%</b>
              </div>
              <ion-range
                formControlName="weight_stock"
                min="0"
                max="100"
                step="5"
                aria-label="Peso de la disponibilidad"
                [attr.aria-valuetext]="getPercent(weights.weight_stock) + '%'"
                [disabled]="loading || sourceLoading"
                (ionChange)="onRangeChange('weight_stock', $event.detail.value)"
              ></ion-range>
            </div>

            <div class="slider-item">
              <div class="slider-header">
                <span id="specs-weight-label">Especificaciones Técnicas:</span>
                <b>{{ getPercent(weights.weight_specs) }}%</b>
              </div>
              <ion-range
                formControlName="weight_specs"
                min="0"
                max="100"
                step="5"
                aria-label="Peso de las especificaciones"
                [attr.aria-valuetext]="getPercent(weights.weight_specs) + '%'"
                [disabled]="loading || sourceLoading"
                (ionChange)="onRangeChange('weight_specs', $event.detail.value)"
              ></ion-range>
            </div>
          </div>

          <p class="weights-note" [class.weights-warning]="totalWeightPercent !== 100">
            Suma actual: <b>{{ totalWeightPercent }}%</b>. No es obligatorio que sume 100 %: el
            motor normaliza los pesos y muestra los pesos efectivos al calcular.
          </p>

          <div class="btn-container">
            <ion-button
              type="button"
              (click)="evaluate()"
              [disabled]="
                loading || (activeSourceRun !== null && activeSourceRun.metrics.accepted < 2)
              "
            >
              @if (loading) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
              }
              {{ loading ? 'Calculando...' : 'Calcular ranking' }}
            </ion-button>
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
              <ion-badge [color]="getLevelColor(topProduct.level)">{{
                topProduct.level
              }}</ion-badge>
            </div>
            <p class="winner-details">
              <b>Puntaje final:</b> {{ topProduct.final_score }} / 100 |
              <b>Precio{{ activeSourceRun ? ' de muestra' : '' }}:</b>
              {{ formatProductPrice(topProduct) }} | <b>Marca:</b> {{ topProduct.brand }}
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
                Pesos efectivos: precio {{ getPercent(evaluation.effective_weights.weight_price) }}%
                · valoración {{ getPercent(evaluation.effective_weights.weight_quality) }}% ·
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
                    @if (activeSourceRun) {
                      <th>Categoría</th>
                    }
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
                      @if (activeSourceRun) {
                        <td>{{ item.category }}</td>
                      }
                      <td>{{ formatProductPrice(item) }}</td>
                      <td>
                        {{
                          item.quality_rating != null
                            ? item.quality_rating + ' / 5'
                            : 'No disponible'
                        }}
                      </td>
                      <td>{{ item.stock != null ? item.stock : 'No disponible' }}</td>
                      <td>
                        {{
                          item.specs_score != null ? item.specs_score + ' / 100' : 'No disponible'
                        }}
                      </td>
                      <td>
                        <b>{{ item.final_score }}</b>
                      </td>
                      <td>
                        <ion-badge [color]="getLevelColor(item.level)">
                          {{ item.level }}
                        </ion-badge>
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
      </form>
    </div>
  `,
  styles: [
    `
      .evaluator-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 0;
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
        display: block;
        margin-top: 0.5rem;
        color: #92400e;
      }

      ion-input,
      ion-select {
        margin: 0.35rem 0;
        --color: #1e293b;
        --placeholder-color: #64748b;
        --label-color: #334155;
      }

      ion-range {
        padding: 0;
        min-width: 0;
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

      .weights-note {
        color: #475569;
        font-size: 0.85rem;
        margin: 0.75rem 0 0.25rem;
      }

      .weights-warning {
        color: #b45309;
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
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
      }

      .winner-title-row h4 {
        flex: 1 1 auto;
        min-width: 0;
      }

      .winner-title-row ion-badge {
        max-width: 100%;
        white-space: normal;
        text-align: right;
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
        min-width: 820px;
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

  readonly sourceCategories = [
    { slug: 'laptops', label: 'Laptops' },
    { slug: 'smartphones', label: 'Smartphones' },
    { slug: 'tablets', label: 'Tablets' },
    { slug: 'mobile-accessories', label: 'Accesorios móviles' },
    { slug: 'fragrances', label: 'Fragancias' },
    { slug: 'beauty', label: 'Belleza' },
    { slug: 'skin-care', label: 'Cuidado de la piel' },
    { slug: 'mens-shirts', label: 'Camisas de hombre' },
    { slug: 'mens-shoes', label: 'Zapatos de hombre' },
    { slug: 'mens-watches', label: 'Relojes de hombre' },
    { slug: 'womens-dresses', label: 'Vestidos de mujer' },
    { slug: 'womens-shoes', label: 'Zapatos de mujer' },
    { slug: 'womens-bags', label: 'Bolsos de mujer' },
    { slug: 'womens-jewellery', label: 'Joyería de mujer' },
    { slug: 'womens-watches', label: 'Relojes de mujer' },
    { slug: 'sunglasses', label: 'Gafas de sol' },
    { slug: 'tops', label: 'Tops' },
    { slug: 'furniture', label: 'Muebles' },
    { slug: 'home-decoration', label: 'Decoración del hogar' },
    { slug: 'kitchen-accessories', label: 'Accesorios de cocina' },
    { slug: 'groceries', label: 'Comestibles' },
    { slug: 'sports-accessories', label: 'Accesorios deportivos' },
    { slug: 'motorcycle', label: 'Motos' },
    { slug: 'vehicle', label: 'Vehículos' },
  ];

  weights: WeightVector = {
    weight_price: 0.4,
    weight_quality: 0.3,
    weight_stock: 0.1,
    weight_specs: 0.2,
  };

  evaluation: EvaluationResponse | null = null;
  loading: boolean = false;
  sourceLoading = false;
  sourceMessage = '';
  contextProfile: ContextProfile = 'equilibrado';
  activeSourceRun: SourceSearchResponse | null = null;

  readonly evaluatorForm: FormGroup;

  get profileDescription(): string {
    return this.profiles[this.contextProfile].description;
  }

  get sourceCategoryControl() {
    return this.evaluatorForm.controls['sourceCategory'];
  }

  constructor(
    private readonly apiService: ApiService,
    private readonly formBuilder: FormBuilder,
  ) {
    this.evaluatorForm = this.formBuilder.group({
      sourceCategory: ['laptops', Validators.required],
      contextProfile: ['equilibrado', Validators.required],
      weight_price: [40, [Validators.min(0), Validators.max(100)]],
      weight_quality: [30, [Validators.min(0), Validators.max(100)]],
      weight_stock: [10, [Validators.min(0), Validators.max(100)]],
      weight_specs: [20, [Validators.min(0), Validators.max(100)]],
    });
  }

  ngOnInit(): void {
    this.syncWeightControls();
    this.evaluate();
  }

  get topProduct(): RankedProduct | null {
    return this.evaluation?.ranking?.[0] ?? null;
  }

  onRangeChange(key: keyof WeightVector, value: number | { lower: number; upper: number }): void {
    const numericValue = typeof value === 'number' ? value : value.lower;
    this.onSliderPreview(key, numericValue);
    this.evaluate();
  }

  onSliderPreview(key: keyof WeightVector, value?: number): void {
    const control = this.evaluatorForm.controls[key];
    const percentage = typeof value === 'number' ? Math.round(value) : Number(control.value ?? 0);

    control.setValue(percentage, { emitEvent: false });
    this.contextProfile = 'personalizado';
    this.evaluatorForm.controls['contextProfile'].setValue('personalizado', {
      emitEvent: false,
    });
    this.weights = { ...this.weights, [key]: percentage / 100 };
  }

  onContextChange(value: string): void {
    if (!Object.prototype.hasOwnProperty.call(this.profiles, value)) return;
    this.contextProfile = value as ContextProfile;
    this.weights = { ...this.profiles[this.contextProfile].weights };
    this.syncWeightControls();
    this.evaluate();
  }

  private syncWeightControls(): void {
    this.evaluatorForm.patchValue(
      {
        weight_price: Math.round(this.weights.weight_price * 100),
        weight_quality: Math.round(this.weights.weight_quality * 100),
        weight_stock: Math.round(this.weights.weight_stock * 100),
        weight_specs: Math.round(this.weights.weight_specs * 100),
      },
      { emitEvent: false },
    );
  }

  searchSource(): void {
    const slug = String(this.evaluatorForm.controls['sourceCategory'].value ?? '').trim();
    const category = this.sourceCategories.find((item) => item.slug === slug);
    if (!category || this.sourceLoading) return;

    this.sourceLoading = true;
    this.sourceMessage = '';
    this.evaluation = null;
    this.apiService.searchDemoProducts(category.label, 10, category.slug).subscribe({
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

  get totalWeightPercent(): number {
    return Math.round(
      (this.weights.weight_price +
        this.weights.weight_quality +
        this.weights.weight_stock +
        this.weights.weight_specs) *
        100,
    );
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

  getLevelColor(level: string): string {
    switch (level) {
      case 'Altamente Recomendado':
        return 'success';
      case 'Recomendado':
        return 'primary';
      case 'Aceptable':
        return 'warning';
      default:
        return 'medium';
    }
  }
}
