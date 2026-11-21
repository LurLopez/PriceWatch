import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let request: { user?: { role: Role } };

  const context = () =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
    request = {};
  });

  it('permite rutas sin roles declarados', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);
    expect(guard.canActivate(context())).toBe(true);
  });

  it('permite un rol autorizado', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([Role.ADMIN]);
    request.user = { role: Role.ADMIN };
    expect(guard.canActivate(context())).toBe(true);
  });

  it('rechaza un rol no autorizado', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([Role.ADMIN]);
    request.user = { role: Role.USER };
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
  });

  it('rechaza solicitudes sin usuario autenticado', () => {
    reflector.getAllAndOverride.mockReturnValueOnce([Role.USER]);
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
  });
});
