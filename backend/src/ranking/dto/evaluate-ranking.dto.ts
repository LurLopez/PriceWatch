import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export class WeightsDto {
  @ApiProperty({ example: 0.4, description: 'Peso del criterio Precio (0.0 a 1.0)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_price: number;

  @ApiProperty({ example: 0.3, description: 'Peso del criterio Calidad (0.0 a 1.0)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_quality: number;

  @ApiProperty({ example: 0.1, description: 'Peso del criterio Stock (0.0 a 1.0)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_stock: number;

  @ApiProperty({ example: 0.2, description: 'Peso del criterio Especificaciones (0.0 a 1.0)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight_specs: number;
}

export class EvaluateRankingDto {
  @ApiProperty({ type: WeightsDto, description: 'Vector de pesos de ponderación' })
  @ValidateNested()
  @Type(() => WeightsDto)
  weights: WeightsDto;

  @ApiProperty({ required: false, example: 'Laptops', description: 'Categoría opcional a evaluar' })
  @IsOptional()
  category?: string;
}
