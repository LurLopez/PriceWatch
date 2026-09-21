import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { EvaluateRankingDto } from './dto/evaluate-ranking.dto';

@ApiTags('Ranking')
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluar ranking multicriterio y persistir en historial' })
  @ApiResponse({ status: 200, description: 'Ranking calculado con éxito' })
  @ApiResponse({ status: 400, description: 'Ponderaciones inválidas' })
  async evaluate(@Body() body: EvaluateRankingDto) {
    return this.rankingService.evaluate(body.weights, body.category);
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de evaluaciones guardadas' })
  @ApiResponse({ status: 200, description: 'Historial de evaluaciones' })
  async getHistory() {
    return this.rankingService.getHistory();
  }
}
