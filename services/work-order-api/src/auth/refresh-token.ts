import { createHash, randomBytes } from 'node:crypto';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Refresh tokens are opaque random strings, not JWTs: they are only ever checked
 * against the database, so they can be revoked, and they carry no readable claims.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Stored as a SHA-256 hash. A fast hash is appropriate here (unlike passwords) because
 * the token has 384 bits of entropy, so it cannot be brute-forced from a leaked hash.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
