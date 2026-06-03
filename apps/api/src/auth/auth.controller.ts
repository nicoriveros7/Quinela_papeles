import { Body, Controller, Post } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() input: RegisterDto) {
    return this.authService.register(input);
  }

  @Public()
  @Post('login')
  async login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.authService.forgotPassword(input);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() input: ResetPasswordDto) {
    return this.authService.resetPassword(input);
  }
}
