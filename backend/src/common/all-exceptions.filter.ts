import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContextService } from './request-context.service';
import { logStructured } from './structured-logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly requestContext: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId =
      this.requestContext.getRequestId() ??
      (request as Request & { requestId?: string }).requestId;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse, status);
    const errorName =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? ((exceptionResponse as { error?: string }).error ??
          this.statusName(status))
        : this.statusName(status);

    logStructured(status >= 500 ? 'error' : 'warn', 'request.exception', {
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      status,
      error: exception instanceof Error ? exception.message : String(exception),
      stack:
        status >= 500 && exception instanceof Error
          ? exception.stack
          : undefined,
    });

    response.status(status).json({
      statusCode: status,
      message,
      error: errorName,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    });
  }

  private statusName(status: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return names[status] ?? 'Error';
  }

  private extractMessage(
    exceptionResponse: string | object | null,
    status: number,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const value = (exceptionResponse as { message?: unknown }).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(String);
    }
    return status >= 500
      ? 'Error interno del servidor.'
      : 'Solicitud no válida.';
  }
}
