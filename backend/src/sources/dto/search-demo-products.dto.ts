import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class SearchDemoProductsDto {
  @ApiProperty({ example: 'laptop', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  @Matches(/^[\p{L}\p{N} ._+#-]+$/u, {
    message: 'La consulta solo puede contener palabras y códigos de producto.',
  })
  query!: string;

  @ApiProperty({ example: 10, minimum: 2, maximum: 20, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(20)
  limit = 10;

  @ApiProperty({
    example: true,
    description: 'Confirma una consulta puntual a la API de muestra',
  })
  @Equals(true)
  acknowledged!: boolean;
}
