import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  login(dto: LoginDto) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'lur.lopez.f@mail.pucv.cl';
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD') || 'change_me_too';

    if (dto.email !== adminEmail || dto.password !== adminPassword) {
      throw new UnauthorizedException('Credenciales inválidas. Compruebe usuario y contraseña.');
    }

    return {
      accessToken: `pw_token_${Buffer.from(dto.email).toString('base64')}_${Date.now()}`,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: {
        email: dto.email,
        role: 'ADMIN',
      },
    };
  }
}
