import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secret123', 4);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '1h';
        return undefined;
      }),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('devuelve un token y los datos públicos del usuario con credenciales válidas', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@pricewatch.local',
      passwordHash,
      role: 'ADMIN',
      active: true,
      createdAt: new Date(),
    });

    const result = await service.login({
      email: 'ADMIN@pricewatch.local',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'admin@pricewatch.local',
      role: 'ADMIN',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'admin@pricewatch.local',
      role: 'ADMIN',
    });
  });

  it('rechaza una contraseña incorrecta sin revelar si el usuario existe', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@pricewatch.local',
      passwordHash,
      role: 'ADMIN',
      active: true,
    });

    await expect(
      service.login({
        email: 'admin@pricewatch.local',
        password: 'incorrecta',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza usuarios inexistentes o inactivos', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.login({
        email: 'nadie@pricewatch.local',
        password: 'secret123',
      }),
    ).rejects.toThrow(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-2',
      email: 'inactivo@pricewatch.local',
      passwordHash,
      role: 'USER',
      active: false,
    });
    await expect(
      service.login({
        email: 'inactivo@pricewatch.local',
        password: 'secret123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('devuelve el perfil del usuario autenticado sin exponer el hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@pricewatch.local',
      passwordHash,
      role: 'ADMIN',
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.me('user-1');

    expect(result.email).toBe('admin@pricewatch.local');
    expect(result.role).toBe('ADMIN');
    expect(result).not.toHaveProperty('passwordHash');
  });
});
