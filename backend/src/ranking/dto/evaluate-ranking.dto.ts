import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class WeightsDto {
  @ApiProperty({
    example: 0.4,
    description: 'Peso del criterio Precio (0.0 a 1.0)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_price: number;

  @ApiProperty({
    example: 0.3,
    description: 'Peso del criterio Calidad (0.0 a 1.0)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_quality: number;

  @ApiProperty({
    example: 0.1,
    description: 'Peso del criterio Stock (0.0 a 1.0)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_stock: number;

  @ApiProperty({
    example: 0.2,
    description: 'Peso del criterio Especificaciones (0.0 a 1.0)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_specs: number;
}

export class EvaluateRankingDto {
  @ApiProperty({
    type: WeightsDto,
    required: false,
    description: 'Pesos para el perfil personalizado',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WeightsDto)
  weights?: WeightsDto;

  @ApiProperty({
    required: false,
    enum: ['economia', 'equilibrado', 'valoraciones', 'personalizado'],
    example: 'equilibrado',
  })
  @IsOptional()
  @IsIn(['economia', 'equilibrado', 'valoraciones', 'personalizado'])
  context_profile?:
    'economia' | 'equilibrado' | 'valoraciones' | 'personalizado';

  @ApiProperty({
    required: false,
    example: 'Laptops',
    description: 'Categoría opcional a evaluar',
  })
  @IsOptional()
  category?: string;

  @ApiProperty({
    required: false,
    description: 'ID de corrida de fuente cuyos resultados se evaluarán',
  })
  @IsOptional()
  @IsUUID()
  source_run_id?: string;
}
