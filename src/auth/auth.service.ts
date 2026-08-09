import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService){}

  async hashPassword(password: string){
    const saltRounds = 12;
    const salt: string = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    
    return hash;
  }

  async savePasswordCredentials(UserId: string, password: string){
    const hashedPassword = await this.hashPassword(password)
  }
}
