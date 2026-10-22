import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar salud del backend, PostgreSQL y motor FastAPI',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio operativo; el motor puede estar degradado',
  })
  @ApiResponse({ status: 503, description: 'Base de datos no disponible' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'pricewatch-api',
        database: 'disconnected',
        message: 'No se pudo conectar con la base de datos PostgreSQL.',
      });
    }

    const pythonUrl =
      this.configService.get<string>('PYTHON_SERVICE_URL') ||
      'http://localhost:8000';
    let analytics = 'connected';
    try {
      await firstValueFrom(
        this.httpService.get(`${pythonUrl}/health`, { timeout: 2000 }),
      );
    } catch {
      analytics = 'disconnected';
    }

    return {
      status: analytics === 'connected' ? 'ok' : 'degraded',
      service: 'pricewatch-api',
      database: 'connected',
      analytics,
      timestamp: new Date().toISOString(),
    };
  }
}
