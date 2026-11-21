import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RankingService } from './ranking.service';
import { EvaluateRankingDto } from './dto/evaluate-ranking.dto';

@ApiTags('Ranking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER, Role.ADMIN)
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('evaluate')
  @ApiOperation({
    summary: 'Evaluar ranking multicriterio y persistir en historial',
  })
  @ApiResponse({ status: 200, description: 'Ranking calculado con éxito' })
  @ApiResponse({ status: 400, description: 'Ponderaciones inválidas' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async evaluate(
    @Body() body: EvaluateRankingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rankingService.evaluate(
      body.weights,
      body.category,
      body.context_profile,
      body.source_run_id,
      user.sub,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de evaluaciones guardadas' })
  @ApiResponse({ status: 200, description: 'Historial de evaluaciones' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async getHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.rankingService.getHistory(
      user.sub,
      user.role === Role.ADMIN,
    );
  }
}
