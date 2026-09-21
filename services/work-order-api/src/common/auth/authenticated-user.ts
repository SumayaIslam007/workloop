import type { Request } from 'express';
import type { UserRole } from '@workloop/shared-types';

/** The identity carried in a verified access token. */
export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  companyId: string | null;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  companyId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
