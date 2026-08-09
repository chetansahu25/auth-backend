import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { RegisterUserDto } from '../user/dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Post("/signup")
  async create(@Body() registerUserDto: RegisterUserDto){
    const { id } = await this.userService.createUser(registerUserDto)
    
    const passwordCredentials = await this.authService.savePasswordCredentials(id, registerUserDto.password)
    
  }
}
