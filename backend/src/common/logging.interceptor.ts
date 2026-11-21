import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricsService } from '../metrics/metrics.service';
import { RequestContextService } from './request-context.service';
import { logStructured } from './structured-logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly requestContext: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startedAt = Date.now();
    const requestId =
      this.requestContext.getRequestId() ?? request.requestId ?? 'unknown';
    const baseContext = {
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      user: request.user?.email ?? null,
      role: request.user?.role ?? null,
    };

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const status = response.statusCode;
        this.metricsService.record(status, durationMs);
        logStructured('info', 'request.completed', {
          ...baseContext,
          status,
          durationMs,
        });
      }),
      catchError((error: { status?: number; message?: string }) => {
        const durationMs = Date.now() - startedAt;
        const status = error?.status ?? 500;
        this.metricsService.record(status, durationMs);
        logStructured(status >= 500 ? 'error' : 'warn', 'request.failed', {
          ...baseContext,
          status,
          durationMs,
          error: error?.message ?? 'Error desconocido',
        });
        return throwError(() => error);
      }),
    );
  }
}
