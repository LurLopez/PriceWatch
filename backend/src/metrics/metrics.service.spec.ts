import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('calcula totales, errores, tasa y latencia promedio', () => {
    const service = new MetricsService();

    service.record(200, 10);
    service.record(201, 20);
    service.record(500, 30);

    const snapshot = service.snapshot();

    expect(snapshot.totalRequests).toBe(3);
    expect(snapshot.errorRequests).toBe(1);
    expect(snapshot.errorRate).toBe(33.33);
    expect(snapshot.averageResponseTimeMs).toBe(20);
    expect(snapshot.statusCounts).toEqual({ 200: 1, 201: 1, 500: 1 });
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('devuelve ceros cuando no hay solicitudes', () => {
    const snapshot = new MetricsService().snapshot();
    expect(snapshot.totalRequests).toBe(0);
    expect(snapshot.errorRate).toBe(0);
    expect(snapshot.averageResponseTimeMs).toBe(0);
  });
});
