import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@workloop/shared-types';
import type { AuthenticatedUser } from './authenticated-user';
import { RolesGuard } from './roles.guard';

function contextFor(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const buyer: AuthenticatedUser = { id: 'u1', role: UserRole.BUYER, companyId: 'c1' };
const technician: AuthenticatedUser = { id: 'u2', role: UserRole.TECHNICIAN, companyId: null };

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  afterEach(() => jest.restoreAllMocks());

  it('allows any authenticated user when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextFor(technician))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.BUYER]);
    expect(guard.canActivate(contextFor(buyer))).toBe(true);
  });

  it('rejects a user whose role is not listed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.BUYER]);
    expect(() => guard.canActivate(contextFor(technician))).toThrow(ForbiddenException);
  });
});
