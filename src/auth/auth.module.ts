import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  controllers: [AuthController],
  imports: [UserModule, PrismaModule, EmailModule],
  providers: [AuthService],
})
export class AuthModule {}
