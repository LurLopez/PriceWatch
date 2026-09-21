import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Verificar salud del backend y conexión a base de datos' })
  @ApiResponse({ status: 200, description: 'Servicio y base de datos operativos' })
  @ApiResponse({ status: 503, description: 'Base de datos no disponible' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'pricewatch-api',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'pricewatch-api',
        database: 'disconnected',
        message: 'No se pudo conectar con la base de datos PostgreSQL.',
      });
    }
  }
}
