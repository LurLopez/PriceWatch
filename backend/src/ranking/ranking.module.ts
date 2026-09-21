import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [HttpModule, ProductsModule],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
