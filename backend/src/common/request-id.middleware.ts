import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from './request-context.service';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,100}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const incoming = request.header('x-request-id');
    const requestId =
      incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();

    (request as Request & { requestId?: string }).requestId = requestId;
    response.setHeader('x-request-id', requestId);

    this.requestContext.run({ requestId }, () => next());
  }
}
