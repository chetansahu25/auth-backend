import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { UserService } from '../user/user.service';
import AuthUtility from '../utils/auth.utility';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {

    //save and get Id of user
    const { id } = await this.userService.createUser(registerUserDto);

    //generating hashed password
    const hash = await AuthUtility.generatePasswordHash(
      registerUserDto.password,
    );

    //saving password to db
    const savePasswordCredentials = this.prisma.passwordCredentials.create({
      data: {
        userId: id,
        hashedPassword: hash,
      },
    });

    //sending verification email 

    //create otp hash

    //declare otp purpose and id

    //save otp details to db


    //return otp id to the user


  }
}
