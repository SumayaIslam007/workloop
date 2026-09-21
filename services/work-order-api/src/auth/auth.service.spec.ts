import { Logger, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashRefreshToken } from './refresh-token';

const user = {
  id: 'user-1',
  email: 'tech1@workloop.test',
  name: 'Aisha Rahman',
  role: 'technician' as const,
  companyId: null,
  createdAt: new Date('2026-01-01'),
};

function setup() {
  const prisma = {
    refreshToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.access.token') };
  const config = {
    get: jest.fn(
      (key: keyof Env) =>
        ({ REFRESH_TOKEN_TTL_DAYS: 7, JWT_ACCESS_TTL_SECONDS: 900 })[key as string],
    ),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService<Env, true>,
  );
  return { service, prisma, jwt };
}

const storedToken = (overrides: Record<string, unknown> = {}) => ({
  id: 'rt-1',
  userId: user.id,
  tokenHash: hashRefreshToken('old-token'),
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  user,
  ...overrides,
});

describe('AuthService.refresh', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('rotates a valid token: revokes it and issues a new session', async () => {
    const { service, prisma } = setup();
    prisma.refreshToken.findUnique.mockResolvedValue(storedToken());

    const session = await service.refresh('old-token');

    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashRefreshToken('old-token') } }),
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'rt-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(session.response).toMatchObject({
      accessToken: 'signed.access.token',
      user: { id: user.id },
    });
    expect(session.refreshToken).not.toBe('old-token');
    // Only the hash of the new token is stored, never the token itself.
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tokenHash: hashRefreshToken(session.refreshToken) }),
    });
  });

  it('revokes every session when an already-rotated token is reused', async () => {
    const { service, prisma } = setup();
    prisma.refreshToken.findUnique.mockResolvedValue(storedToken({ revokedAt: new Date() }));

    await expect(service.refresh('old-token')).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('treats losing a concurrent rotation race as reuse', async () => {
    const { service, prisma } = setup();
    prisma.refreshToken.findUnique.mockResolvedValue(storedToken());
    prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.refresh('old-token')).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects expired, unknown and missing tokens', async () => {
    const { service, prisma } = setup();

    prisma.refreshToken.findUnique.mockResolvedValueOnce(
      storedToken({ expiresAt: new Date(Date.now() - 1) }),
    );
    await expect(service.refresh('old-token')).rejects.toThrow('Refresh token expired');

    prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(service.refresh('unknown')).rejects.toThrow('Invalid refresh token');

    await expect(service.refresh(undefined)).rejects.toThrow('Missing refresh token');
  });
});
