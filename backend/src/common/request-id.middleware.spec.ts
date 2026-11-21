import { RequestContextService } from './request-context.service';
import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('genera un request ID y lo expone en la respuesta', () => {
    const context = new RequestContextService();
    const middleware = new RequestIdMiddleware(context);
    const request = { header: jest.fn().mockReturnValue(undefined) };
    const response = { setHeader: jest.fn() };
    let contextId: string | undefined;
    const next = jest.fn(() => {
      contextId = context.getRequestId();
    });

    middleware.use(request as never, response as never, next);

    const headerValue = response.setHeader.mock.calls[0][1];
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      expect.any(String),
    );
    expect(headerValue).toMatch(/^[A-Za-z0-9._-]{1,100}$/);
    expect(contextId).toBe(headerValue);
    expect(next).toHaveBeenCalled();
  });

  it('reutiliza un request ID entrante seguro', () => {
    const context = new RequestContextService();
    const middleware = new RequestIdMiddleware(context);
    const request = { header: jest.fn().mockReturnValue('req-abc-123') };
    const response = { setHeader: jest.fn() };

    middleware.use(request as never, response as never, jest.fn());

    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'req-abc-123',
    );
  });

  it('descarta un request ID entrante con caracteres no permitidos', () => {
    const context = new RequestContextService();
    const middleware = new RequestIdMiddleware(context);
    const request = { header: jest.fn().mockReturnValue('<script>') };
    const response = { setHeader: jest.fn() };

    middleware.use(request as never, response as never, jest.fn());

    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      expect.not.stringMatching(/<script>/),
    );
  });
});
