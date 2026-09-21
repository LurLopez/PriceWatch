import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch {
      console.warn('Aviso: Base de datos PostgreSQL no disponible en inicio. Se conectará bajo demanda.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
