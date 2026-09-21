import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { WeightVector } from '../models/product.model';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return products in mock mode directly', async () => {
    service.mockMode = true;
    const products = await firstValueFrom(service.getProducts());
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].name).toBeDefined();
  });

  it('should provide fallback products when HTTP fails in live mode', async () => {
    service.mockMode = false;
    const promise = firstValueFrom(service.getProducts());

    const req = httpMock.expectOne('/api/products');
    req.error(new ProgressEvent('error'));

    const products = await promise;
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].name).toBeDefined();
  });

  it('should compute local ranking when evaluate HTTP fails in live mode', async () => {
    service.mockMode = false;
    const weights: WeightVector = {
      weight_price: 0.5,
      weight_quality: 0.3,
      weight_stock: 0.1,
      weight_specs: 0.1,
    };

    const promise = firstValueFrom(service.evaluateRanking(weights));

    const req = httpMock.expectOne('/api/ranking/evaluate');
    req.error(new ProgressEvent('error'));

    const response = await promise;
    expect(response.status).toBe('success_local');
    expect(response.ranking.length).toBeGreaterThan(0);
    expect(response.top_recommended_product_id).toBeTruthy();
    expect(response.ranking[0].rank_position).toBe(1);
  });
});
