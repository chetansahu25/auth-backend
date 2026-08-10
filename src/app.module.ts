import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, EmailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
