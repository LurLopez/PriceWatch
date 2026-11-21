import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonBadge, IonCard, IonCardContent, IonNote, IonSpinner } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { EvaluationHistoryItem } from '../../models/product.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, IonBadge, IonCard, IonCardContent, IonNote, IonSpinner],
  template: `
    <div class="history-container">
      <h2>Historial de Evaluaciones</h2>
      <p class="subtitle">Registro de las últimas evaluaciones realizadas:</p>

      @if (loading) {
        <div class="loading-row">
          <ion-spinner name="crescent"></ion-spinner>
          <span>Cargando historial…</span>
        </div>
      }

      @if (errorMessage) {
        <ion-note color="danger" role="alert">{{ errorMessage }}</ion-note>
      }

      <div class="history-list">
        @for (item of history; track item.id) {
          <ion-card class="history-card">
            <ion-card-content>
              <div class="card-header">
                <span class="date">{{ formatDate(item.evaluated_at) }}</span>
                <ion-badge color="primary">Puntaje: {{ item.top_product_score }} / 100</ion-badge>
              </div>

              <h4>Ganador: {{ item.top_product_name }}</h4>
              <p class="explanation">{{ item.explanation }}</p>
              @if (item.context_profile) {
                <p class="context-info">
                  Perfil: {{ formatProfile(item.context_profile) }}
                  @if (item.source_run_id) {
                    · Corrida de fuente: {{ item.source_run_id }}
                  }
                </p>
              }

              <div class="weights-info">
                <span><b>Pesos:</b></span>
                <span>Precio: {{ getPercent(item.weight_price) }}%</span>
                <span>Calidad: {{ getPercent(item.weight_quality) }}%</span>
                <span>Stock: {{ getPercent(item.weight_stock) }}%</span>
                <span>Specs: {{ getPercent(item.weight_specs) }}%</span>
              </div>
            </ion-card-content>
          </ion-card>
        } @empty {
          @if (!loading) {
            <ion-card>
              <ion-card-content>
                <ion-note>No hay evaluaciones en el historial todavía.</ion-note>
              </ion-card-content>
            </ion-card>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .history-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .subtitle {
        color: #64748b;
      }

      .loading-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #64748b;
        font-size: 0.9rem;
      }

      .history-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .history-card {
        margin: 0;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: #64748b;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
      }

      .history-card h4 {
        font-size: 1.05rem;
        margin-bottom: 0.3rem;
      }

      .explanation {
        font-size: 0.9rem;
        color: #334155;
        margin-bottom: 0.5rem;
      }

      .context-info {
        color: #0f766e;
        font-size: 0.84rem;
        overflow-wrap: anywhere;
      }

      .weights-info {
        display: flex;
        gap: 0.75rem;
        font-size: 0.82rem;
        color: #64748b;
        background: #f8fafc;
        padding: 0.4rem 0.6rem;
        border-radius: 4px;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class HistoryComponent implements OnInit {
  history: EvaluationHistoryItem[] = [];
  loading = true;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getHistory().subscribe({
      next: (data) => {
        this.history = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage =
          'No se pudo cargar el historial. Verifique la sesión y la conexión con la API.';
      },
    });
  }

  getPercent(val: number): number {
    return Math.round(val * 100);
  }

  formatProfile(profile: string | undefined): string {
    const labels: Record<string, string> = {
      economia: 'Ahorro',
      equilibrado: 'Equilibrio',
      valoraciones: 'Valoraciones',
      personalizado: 'Personalizado',
    };
    return profile ? (labels[profile] ?? profile) : 'Personalizado';
  }

  formatDate(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }
}
