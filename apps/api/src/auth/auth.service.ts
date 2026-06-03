import { createHash, randomBytes } from 'crypto';

import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtUserPayload } from './types/jwt-user-payload.type';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes
const GENERIC_FORGOT_RESPONSE = {
  message: 'Si el correo existe, enviaremos instrucciones para restablecer tu contraseña.',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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

    return { accessToken, user };
  }

  async login(input: LoginDto) {
    const user = await this.usersService.findByIdentifierWithPassword(input.identifier);
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

    return { accessToken, user: profile };
  }

  async forgotPassword(input: ForgotPasswordDto) {
    const user = await this.usersService.findByEmailWithPassword(input.email);

    if (!user || !user.isActive) {
      return GENERIC_FORGOT_RESPONSE;
    }

    // Invalidate any active tokens for this user before creating a new one
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, token, user.displayName);

    return GENERIC_FORGOT_RESPONSE;
  }

  async resetPassword(input: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'El enlace de recuperación no es válido o ha expirado.',
      );
    }

    const passwordHash = await hash(input.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Mark this token as used
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate any other tokens for the same user
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, id: { not: record.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Contraseña actualizada correctamente.' };
  }
}
