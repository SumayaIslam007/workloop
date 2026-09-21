import {
  ConflictException,
  Injectable,
  Logger,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@workloop/shared-types';
import * as argon2 from 'argon2';
import type { AccessTokenPayload } from '../common/auth/authenticated-user';
import type { Env } from '../config/env';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toUserDto } from '../users/dto/user.dto';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { generateRefreshToken, hashRefreshToken } from './refresh-token';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Access token response plus the raw refresh token, which the controller puts in a cookie. */
export interface IssuedSession {
  response: AuthResponseDto;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

type UserRecord = Parameters<typeof toUserDto>[0];

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  /** Verified against when the email is unknown, so response time doesn't reveal which emails exist. */
  private dummyPasswordHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await argon2.hash('dummy-password-for-timing-safety');
  }

  async register(dto: RegisterDto): Promise<IssuedSession> {
    const passwordHash = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email: dto.email, passwordHash, name: dto.name, role: dto.role },
        });
        if (dto.role !== UserRole.BUYER || !dto.companyName) {
          return created;
        }
        const company = await tx.company.create({
          data: { name: dto.companyName, ownerUserId: created.id },
        });
        return tx.user.update({ where: { id: created.id }, data: { companyId: company.id } });
      });

      return this.issueSession(user);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = await argon2.verify(user?.passwordHash ?? this.dummyPasswordHash, dto.password);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession(user);
  }

  /**
   * Exchanges a refresh token for a new session and revokes the old token (rotation).
   * If a token that was already rotated is presented again, it has likely been stolen,
   * so every session for that user is revoked.
   */
  async refresh(rawToken: string | undefined): Promise<IssuedSession> {
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      await this.revokeAllSessions(stored.userId);
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; all sessions revoked`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Conditional update: if two requests race with the same token, only one wins.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      await this.revokeAllSessions(stored.userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueSession(stored.user);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(user: UserRecord): Promise<IssuedSession> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
    };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * DAY_MS,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      response: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
        user: toUserDto(user),
      },
      refreshToken,
      refreshTokenExpiresAt,
    };
  }
}
