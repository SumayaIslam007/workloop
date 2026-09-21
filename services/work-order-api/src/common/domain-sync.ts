/**
 * Compile-time guarantee that the database enums and the shared domain types never
 * drift apart. If a value is added to one side only, `pnpm typecheck` fails here.
 */
import type { UserRole, WorkOrderStatus } from '@workloop/shared-types';
import type {
  Role as DbRole,
  WorkOrderStatus as DbWorkOrderStatus,
} from '../generated/prisma/enums';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const roleEnumsMatch: Equals<DbRole, UserRole> = true;
export const workOrderStatusEnumsMatch: Equals<DbWorkOrderStatus, WorkOrderStatus> = true;
