import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchDemoProductsDto } from './dto/search-demo-products.dto';
import { SourcesService } from './sources.service';

@ApiTags('Sources')
@Controller('sources/demo-products')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post('search')
  @ApiOperation({
    summary: 'Consultar una página acotada de productos de demostración',
  })
  @ApiResponse({
    status: 201,
    description: 'Consulta registrada con procedencia y métricas',
  })
  @ApiResponse({ status: 429, description: 'Cooldown o límite de la fuente' })
  @ApiResponse({
    status: 503,
    description: 'La consulta a la fuente está desactivada',
  })
  search(@Body() dto: SearchDemoProductsDto) {
    return this.sourcesService.searchDemoProducts(dto);
  }

  @Get('runs')
  @ApiOperation({
    summary: 'Consultar las últimas corridas de la fuente de demostración',
  })
  getRuns() {
    return this.sourcesService.getRuns();
  }

  @Get('runs/:id')
  @ApiOperation({
    summary: 'Consultar una corrida y sus productos normalizados',
  })
  getRun(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sourcesService.getRun(id);
  }
}
