import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { SystemRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../../users/users.service';
import { JwtUserPayload } from '../types/jwt-user-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback_secret'),
    });
  }

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    const user = await this.usersService.findByEmailWithPassword(payload.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.systemRole as SystemRole,
    };
  }
}
