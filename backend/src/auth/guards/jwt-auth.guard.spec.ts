import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };
  let request: { headers: Record<string, string>; user?: unknown };

  const context = () =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    prisma = { user: { findUnique: jest.fn() } };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      prisma as unknown as PrismaService,
    );
    request = { headers: {} };
  });

  it('rechaza solicitudes sin encabezado Authorization', async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token inválido o expirado', async () => {
    request.headers.authorization = 'Bearer token-invalido';
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('expired'));

    await expect(guard.canActivate(context())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token válido cuyo usuario fue desactivado', async () => {
    request.headers.authorization = 'Bearer token-valido';
    jwtService.verifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      email: 'admin@pricewatch.local',
      role: 'ADMIN',
    });
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@pricewatch.local',
      role: 'ADMIN',
      active: false,
    });

    await expect(guard.canActivate(context())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('adjunta el usuario vigente a la request', async () => {
    request.headers.authorization = 'Bearer token-valido';
    jwtService.verifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      email: 'admin@pricewatch.local',
      role: 'ADMIN',
    });
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@pricewatch.local',
      role: 'ADMIN',
      active: true,
    });

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: 'user-1',
      email: 'admin@pricewatch.local',
      role: 'ADMIN',
    });
  });
});
