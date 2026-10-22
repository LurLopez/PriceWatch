import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
    };
    httpService = {
      get: jest.fn().mockReturnValue(of({ data: { status: 'ok' } })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:8000'),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('debe responder status ok cuando la base de datos y FastAPI responden', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.analytics).toBe('connected');
  });

  it('debe marcar el motor como degradado si FastAPI no responde', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    httpService.get.mockReturnValueOnce(throwError(() => new Error('timeout')));
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.analytics).toBe('disconnected');
  });

  it('debe lanzar ServiceUnavailableException cuando la base de datos falla', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('Conexión rechazada'));
    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
