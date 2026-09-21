import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { EvaluationHistoryItem } from '../../models/product.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-container">
      <h2>Historial de Evaluaciones</h2>
      <p class="subtitle">Registro de las últimas simulaciones realizadas:</p>

      <div class="history-list">
        @for (item of history; track item.id) {
          <div class="card history-card">
            <div class="card-header">
              <span class="date">{{ formatDate(item.evaluated_at) }}</span>
              <span class="score">Puntaje: <b>{{ item.top_product_score }}</b> / 100</span>
            </div>

            <h4>Ganador: {{ item.top_product_name }}</h4>
            <p class="explanation">{{ item.explanation }}</p>

            <div class="weights-info">
              <span><b>Pesos:</b></span>
              <span>Precio: {{ getPercent(item.weight_price) }}%</span>
              <span>Calidad: {{ getPercent(item.weight_quality) }}%</span>
              <span>Stock: {{ getPercent(item.weight_stock) }}%</span>
              <span>Specs: {{ getPercent(item.weight_specs) }}%</span>
            </div>
          </div>
        } @empty {
          <div class="card">
            <p>No hay evaluaciones en el historial todavía.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .subtitle {
      color: #64748b;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .history-card {
      margin-bottom: 0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #64748b;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.4rem;
      margin-bottom: 0.5rem;
    }

    .score b {
      color: #2563eb;
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

    .weights-info {
      display: flex;
      gap: 0.75rem;
      font-size: 0.82rem;
      color: #64748b;
      background: #f8fafc;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      flex-wrap: wrap;
    }
  `]
})
export class HistoryComponent implements OnInit {
  history: EvaluationHistoryItem[] = [];

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getHistory().subscribe((data) => {
      this.history = data;
    });
  }

  getPercent(val: number): number {
    return Math.round(val * 100);
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
