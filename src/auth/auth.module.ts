import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SessionStrategy } from './strategies/session.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    EmailModule,
    PassportModule,
    ConfigModule,
JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET_KEY'),
        signOptions: { expiresIn: '15m' },
      }),    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SessionStrategy, JwtAuthGuard, SessionAuthGuard],
  exports: [JwtAuthGuard, SessionAuthGuard],
})
export class AuthModule {}
