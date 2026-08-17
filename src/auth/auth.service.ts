import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import AuthUtility from '../utils/auth.utility';
import { EmailService } from '../email/email.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SessionMetadata } from '../types/auth.types';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  private async createSession(
    userId: string,
    metadata: SessionMetadata & { deviceId: string; deviceName: string },
  ): Promise<{ id: string; refreshToken: string }> {
    const sessionToken = randomUUID();
    const sessionTokenHash = await AuthUtility.generateTokenHash(sessionToken);

    const session = await this.prisma.sessions.create({
      data: {
        userId,
        sessionTokenHash,
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { id: session.id, refreshToken: sessionToken };
  }

  async registerUser(registerAuthDto: RegisterAuthDto) {
    //save and get Id of user
    const user = await this.prisma.user.findUnique({
      where: { email: registerAuthDto.email },
    });

    if (user) {
      if (user.isEmailVerified == true) {
        throw new ConflictException('User Already Exist');
      }
      await this.prisma.otpChallenges.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          expiresAt: new Date(),
        },
      });
      const otp: number = await AuthUtility.generateOtp();

      const sendEmail = await this.emailService.sendOtp(user.email, otp);

      //create otp hash
      const otpHash = await AuthUtility.generateHash(String(otp));

      const saveOtp = await this.prisma.otpChallenges.create({
        data: {
          userId: user.id,
          destination: user.email,
          purpose: 'EMAIL_VERIFICATION',
          codeHash: otpHash,
          expiresAt: new Date(new Date().getTime() + 15 * 60 * 1000),
        },
      });

    }
    const { id, email } = await this.userService.createUser(registerAuthDto);

    //generating hashed password
    const hashedPassword = await AuthUtility.generateHash(
      registerAuthDto.password,
    );

    //saving password to db
    const savePasswordCredentials = await this.prisma.passwordCredentials.create({
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

    const session = await this.createSession(otpChallenges.userId, {
      ...metadata,
      deviceId,
      deviceName,
    });

    // set is email verified true
    const updateVerification = await this.prisma.user.update({
      where: {
        id: otpChallenges.userId,
      },
      data: {
        isEmailVerified: true,
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
      refreshToken: session.refreshToken,
      expiresIn: 900,
    };
  }

  async refreshSession(refreshToken: string) {
    const tokenHash = await AuthUtility.generateTokenHash(refreshToken);

    const session = await this.prisma.sessions.findUnique({
      where: { sessionTokenHash: tokenHash },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Rotate refresh token
    const newRefreshToken = randomUUID();
    const newTokenHash = await AuthUtility.generateTokenHash(newRefreshToken);

    await this.prisma.sessions.update({
      where: { id: session.id },
      data: {
        sessionTokenHash: newTokenHash,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = this.jwtService.sign({
      sub: session.userId,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  async revokeSession(refreshToken: string) {
    const tokenHash = await AuthUtility.generateTokenHash(refreshToken);

    await this.prisma.sessions.updateMany({
      where: { sessionTokenHash: tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.sessions.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async login(data: LoginDto, metadata: SessionMetadata) {
    const newMetadata = {
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
    };
    const findOption = data.email ? { email: data.email } : { username: data.username }
    
    const user = await this.prisma.user.findFirst({
      where: findOption,
      include: {
        passwordCredentials: true,
      },
    });

    if (!user || user.accountStatus == 'DELETED') {
      throw new NotFoundException("User Doesn't Exist");
    }

    if (!user.passwordCredentials) {
      // User exists but has no password (e.g., OAuth-only account)
      throw new UnauthorizedException('Invalid credentials');
    }

    const isCredentialMatched = await AuthUtility.verifyHash(
      data.password,
      user.passwordCredentials.hashedPassword,
    );

    if (!isCredentialMatched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.createSession(user.id, newMetadata);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      sessionId: session.id,
    });

    // Return tokens to client
    return {
      accessToken,
      refreshToken: session.refreshToken,
      expiresIn: 900,
    };
  }
}
