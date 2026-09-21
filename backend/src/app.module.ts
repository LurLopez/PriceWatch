import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { RankingModule } from './ranking/ranking.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    ProductsModule,
    RankingModule,
    AuthModule,
  ],
})
export class AppModule {}
