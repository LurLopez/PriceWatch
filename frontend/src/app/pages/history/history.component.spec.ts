import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { EvaluationHistoryItem } from '../../models/product.model';
import { HistoryComponent } from './history.component';

const item: EvaluationHistoryItem = {
  id: 'hist-1',
  weight_price: 0.4,
  weight_quality: 0.3,
  weight_stock: 0.1,
  weight_specs: 0.2,
  top_product_id: 'prod-1',
  top_product_name: 'Producto A',
  top_product_score: 85.5,
  explanation: 'Explicación de prueba',
  context_profile: 'economia',
  source_run_id: null,
  evaluated_at: '2026-11-21T12:00:00.000Z',
};

describe('HistoryComponent', () => {
  it('carga el historial y desactiva el estado de carga', () => {
    const api = {
      getHistory: vi.fn().mockReturnValue(of([item])),
    } as unknown as ApiService;
    const component = new HistoryComponent(api);

    component.ngOnInit();

    expect(component.history).toHaveLength(1);
    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('');
  });

  it('formatea porcentajes, perfiles y fechas', () => {
    const api = {
      getHistory: vi.fn().mockReturnValue(of([])),
    } as unknown as ApiService;
    const component = new HistoryComponent(api);

    expect(component.getPercent(0.4)).toBe(40);
    expect(component.formatProfile('economia')).toBe('Ahorro');
    expect(component.formatProfile('valoraciones')).toBe('Valoraciones');
    expect(component.formatProfile(undefined)).toBe('Personalizado');
    expect(component.formatDate('2026-11-21T12:00:00.000Z')).toContain('2026');
  });

  it('muestra un error controlado si la API falla', () => {
    const api = {
      getHistory: vi.fn().mockReturnValue(throwError(() => new Error('fallo'))),
    } as unknown as ApiService;
    const component = new HistoryComponent(api);

    component.ngOnInit();

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toContain('No se pudo cargar el historial');
  });
});
