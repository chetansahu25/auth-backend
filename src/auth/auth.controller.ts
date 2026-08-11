import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async create(@Body() registerAuthDto: RegisterAuthDto) {
    const res = await this.authService.registerUser(registerAuthDto);
    return res;
  }

  @Post('verify')
  async verifyOtp(
    @Body() data: VerifyOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.authService.verifyOtp(data, {
      userAgent: userAgent || 'unknown',
      ipAddress: ip || 'unknown',
    });
  }
}
