import { Controller, Get } from '@nestjs/common';
import { SystemRole } from '@prisma/client';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: JwtUserPayload) {
    return this.usersService.findById(user.sub);
  }

  @Get()
  @Roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
  async listUsers() {
    return this.usersService.listUsers();
  }
}
