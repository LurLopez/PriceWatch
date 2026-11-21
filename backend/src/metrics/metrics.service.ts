import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private totalRequests = 0;
  private errorRequests = 0;
  private totalDurationMs = 0;
  private readonly statusCounts = new Map<number, number>();

  record(status: number, durationMs: number): void {
    this.totalRequests += 1;
    this.totalDurationMs += Math.max(0, durationMs);
    if (status >= 400) {
      this.errorRequests += 1;
    }
    this.statusCounts.set(status, (this.statusCounts.get(status) ?? 0) + 1);
  }

  snapshot() {
    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      totalRequests: this.totalRequests,
      errorRequests: this.errorRequests,
      errorRate:
        this.totalRequests === 0
          ? 0
          : Math.round((this.errorRequests / this.totalRequests) * 10000) / 100,
      averageResponseTimeMs:
        this.totalRequests === 0
          ? 0
          : Math.round((this.totalDurationMs / this.totalRequests) * 100) / 100,
      statusCounts: Object.fromEntries(
        [...this.statusCounts.entries()].sort(([a], [b]) => a - b),
      ),
    };
  }
}
