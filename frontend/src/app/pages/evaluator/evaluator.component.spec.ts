import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { EvaluationResponse, SourceSearchResponse } from '../../models/product.model';
import { EvaluatorComponent } from './evaluator.component';

const evaluation: EvaluationResponse = {
  status: 'success',
  total_products_evaluated: 0,
  top_recommended_product_id: '',
  global_explanation: 'Prueba',
  warnings: [],
  ranking: [],
  context_profile: 'equilibrado',
  active_criteria: ['price'],
  ignored_criteria: ['quality', 'stock', 'specs'],
  effective_weights: {
    weight_price: 1,
    weight_quality: 0,
    weight_stock: 0,
    weight_specs: 0,
  },
  source_run_id: null,
};

const sourceRun: SourceSearchResponse = {
  run_id: 'run-123',
  provider: 'dummyjson',
  query: 'laptop',
  status: 'SUCCEEDED',
  started_at: '2026-10-22T12:00:00.000Z',
  retrieved_at: '2026-10-22T12:00:01.000Z',
  duration_ms: 1000,
  error_code: null,
  metrics: { received: 2, accepted: 2, rejected: 0, duplicates: 0 },
  products: [
    {
      external_id: '1',
      title: 'Laptop A',
      category: 'laptops',
      brand: 'Marca A',
      price: 100,
      currency: null,
      rating: 4,
      availability_reference: 5,
      specs: {},
      source_url: 'https://dummyjson.com/products/1',
      content_hash: 'a'.repeat(64),
      retrieved_at: '2026-10-22T12:00:01.000Z',
    },
    {
      external_id: '2',
      title: 'Laptop B',
      category: 'laptops',
      brand: 'Marca B',
      price: 150,
      currency: null,
      rating: 3,
      availability_reference: 8,
      specs: {},
      source_url: 'https://dummyjson.com/products/2',
      content_hash: 'b'.repeat(64),
      retrieved_at: '2026-10-22T12:00:01.000Z',
    },
  ],
};

describe('EvaluatorComponent EP2', () => {
  function createComponent() {
    const api = {
      evaluateRanking: vi.fn().mockReturnValue(of(evaluation)),
      searchDemoProducts: vi.fn().mockReturnValue(of(sourceRun)),
    } as unknown as ApiService;
    return { component: new EvaluatorComponent(api), api };
  }

  it('applies the selected context profile and recalculates the ranking', () => {
    const { component, api } = createComponent();

    component.onContextChange('economia');

    expect(component.contextProfile).toBe('economia');
    expect(component.weights.weight_price).toBe(0.7);
    expect(api.evaluateRanking).toHaveBeenCalledWith(component.weights, 'economia', undefined);
  });

  it('switches to a custom profile while the slider moves without recalculating each step', () => {
    const { component, api } = createComponent();

    component.onSliderPreview('weight_price', 55);

    expect(component.contextProfile).toBe('personalizado');
    expect(component.weights.weight_price).toBe(0.55);
    expect(api.evaluateRanking).not.toHaveBeenCalled();
  });

  it('evaluates only the explicitly queried source run and exposes its provenance', () => {
    const { component, api } = createComponent();

    component.searchSource();

    expect(api.searchDemoProducts).toHaveBeenCalledWith('laptop', 10);
    expect(api.evaluateRanking).toHaveBeenCalledWith(component.weights, 'equilibrado', 'run-123');
    expect(component.activeSourceRun?.run_id).toBe('run-123');
    expect(component.getSourceListing('dummyjson:2')?.content_hash).toBe('b'.repeat(64));
  });
});
