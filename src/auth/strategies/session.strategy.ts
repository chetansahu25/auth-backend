import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import AuthUtility from '../../utils/auth.utility';

@Injectable()
export class SessionStrategy extends PassportStrategy(Strategy, 'session') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(request: Request) {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Session token required');
    }

    const tokenHash = await AuthUtility.generateTokenHash(refreshToken);

    const session = await this.prisma.sessions.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Update last used timestamp
    await this.prisma.sessions.update({
      where: { id: session.id },
      data: { 
        lastUsedAt: new Date() 
      },
    });

    // Return session info to be attached to request.user
    return {
      userId: session.userId,
      sessionId: session.id,
      user: session.user,
    };
  }
}
