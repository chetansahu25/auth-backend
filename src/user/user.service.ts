import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService){}

  async createUser( data: RegisterUserDto){
    return this.prisma.user.create({data})
  }

}
