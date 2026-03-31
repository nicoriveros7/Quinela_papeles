import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PublicUser } from './types/public-user.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async createUser(input: { email: string; displayName: string; passwordHash: string }) {
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        passwordHash: input.passwordHash,
      },
    });

    return this.toPublicUser(user);
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async listUsers(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => this.toPublicUser(user));
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    displayName: string;
    systemRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      systemRole: user.systemRole,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
