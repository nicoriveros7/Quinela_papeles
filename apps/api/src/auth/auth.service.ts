import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtUserPayload } from './types/jwt-user-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto) {
    const existingUser = await this.usersService.findByEmailWithPassword(input.email);
    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await hash(input.password, 12);
    const user = await this.usersService.createUser({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });

    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.systemRole,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user,
    };
  }

  async login(input: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(input.email);
    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLastLoginAt(user.id);
    const profile = await this.usersService.findById(user.id);

    const payload: JwtUserPayload = {
      sub: profile.id,
      email: profile.email,
      role: profile.systemRole,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: profile,
    };
  }
}
