import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'lur.lopez.f@mail.pucv.cl', description: 'Correo electrónico del usuario' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'change_me_too', description: 'Contraseña de acceso' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
