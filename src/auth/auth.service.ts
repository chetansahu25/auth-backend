import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import AuthUtility from '../utils/auth.utility';
import { EmailService } from '../email/email.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SessionMetadata } from '../types/auth.types';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(registerAuthDto: RegisterAuthDto) {
    //save and get Id of user
    const { id, email } = await this.userService.createUser(registerAuthDto);

    //generating hashed password
    const hashedPassword = await AuthUtility.generateHash(
      registerAuthDto.password,
    );

    //saving password to db
    const savePasswordCredentials = this.prisma.passwordCredentials.create({
      data: {
        userId: id,
        hashedPassword: hashedPassword,
      },
    });

    //generating otp
    const otp: number = await AuthUtility.generateOtp();

    //sending verification email
    const sendEmail = await this.emailService.sendOtp(email, otp);

    //create otp hash
    const otpHash = await AuthUtility.generateHash(String(otp));

    const saveOtp = await this.prisma.otpChallenges.create({
      data: {
        userId: id,
        destination: email,
        purpose: 'EMAIL_VERIFICATION',
        codeHash: otpHash,
        expiresAt: new Date(new Date().getTime() + 15 * 60 * 1000),
      },
    });

    //return otp id to the user
    return saveOtp.id;
  }

  async verifyOtp(data: VerifyOtpDto, metadata: SessionMetadata) {
    //destructure the and take out id and otp from data
    const { id, otp, deviceId, deviceName } = data;
    const { ipAddress, userAgent } = metadata;

    //fetch the db entry [id, codehash]
    const otpChallenges = await this.prisma.otpChallenges.findUnique({
      where: { 
        id,
      },
    });

    // Validate OTP challenge exist
    if (!otpChallenges) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (otpChallenges.consumedAt) {
      throw new UnauthorizedException('OTP already used');
    }

    // Check max attempts (e.g., 5)
    if (otpChallenges.attempts >= 5) {
      throw new UnauthorizedException('Too many attempts');
    }
    // Check expiration
    if (otpChallenges.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP expired');
    }

    // Verify OTP hash
    const isOtpValid = await AuthUtility.verifyHash(
      otp,
      otpChallenges.codeHash,
    );

    if (!isOtpValid) {
      await this.prisma.otpChallenges.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as consumed
    await this.prisma.otpChallenges.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
    const sessionToken = randomUUID();
    const sessionTokenHash = await AuthUtility.generateHash(sessionToken);
    const session = await this.prisma.sessions.create({
      data: {
        deviceId,
        deviceName,
        userAgent,
        ipAddress,
        userId: otpChallenges.userId,
        sessionTokenHash,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Generate JWT access token
    const accessToken = this.jwtService.sign({
      sub: otpChallenges.userId,
      sessionId: session.id,
    });

    // Return tokens to client
    return {
      accessToken, 
      refreshToken: sessionToken, 
      expiresIn: 900, 
    };
  }
}
