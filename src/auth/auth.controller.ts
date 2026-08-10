import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Post("signup")
  async create(@Body() registerAuthDto: RegisterAuthDto){
    const res = await this.authService.registerUser(registerAuthDto);
    return res;
  }
}
