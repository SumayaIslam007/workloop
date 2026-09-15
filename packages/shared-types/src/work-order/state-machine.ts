import { WorkOrderAction, WorkOrderStatus } from './status';

/**
 * The complete set of legal transitions. Anything not listed here is illegal.
 *
 *   DRAFT ─publish─> PUBLISHED ─assign─> ASSIGNED ─start─> IN_PROGRESS ─complete─> COMPLETED ─approve─> APPROVED
 *                        │                   │                  │
 *                        └───────cancel──────┴──────cancel──────┴──> CANCELLED
 *
 * COMPLETED, APPROVED and CANCELLED cannot be cancelled: once work is done,
 * reversing it is a dispute/refund process, not a status change.
 */
const TRANSITIONS: Readonly<
  Record<WorkOrderStatus, Readonly<Partial<Record<WorkOrderAction, WorkOrderStatus>>>>
> = {
  [WorkOrderStatus.DRAFT]: {
    [WorkOrderAction.PUBLISH]: WorkOrderStatus.PUBLISHED,
  },
  [WorkOrderStatus.PUBLISHED]: {
    [WorkOrderAction.ASSIGN]: WorkOrderStatus.ASSIGNED,
    [WorkOrderAction.CANCEL]: WorkOrderStatus.CANCELLED,
  },
  [WorkOrderStatus.ASSIGNED]: {
    [WorkOrderAction.START]: WorkOrderStatus.IN_PROGRESS,
    [WorkOrderAction.CANCEL]: WorkOrderStatus.CANCELLED,
  },
  [WorkOrderStatus.IN_PROGRESS]: {
    [WorkOrderAction.COMPLETE]: WorkOrderStatus.COMPLETED,
    [WorkOrderAction.CANCEL]: WorkOrderStatus.CANCELLED,
  },
  [WorkOrderStatus.COMPLETED]: {
    [WorkOrderAction.APPROVE]: WorkOrderStatus.APPROVED,
  },
  [WorkOrderStatus.APPROVED]: {},
  [WorkOrderStatus.CANCELLED]: {},
};

/**
 * Thrown when an action is not allowed from the current status.
 * The API's exception filter maps this to HTTP 409 Conflict.
 */
export class InvalidTransitionError extends Error {
  override readonly name = 'InvalidTransitionError';

  constructor(
    readonly from: WorkOrderStatus,
    readonly action: WorkOrderAction,
  ) {
    super(`Cannot ${action} a work order that is ${from}`);
  }
}

/** Returns the next status, or throws `InvalidTransitionError`. Pure: no I/O, no mutation. */
export function transition(from: WorkOrderStatus, action: WorkOrderAction): WorkOrderStatus {
  const next = TRANSITIONS[from][action];
  if (next === undefined) {
    throw new InvalidTransitionError(from, action);
  }
  return next;
}

export function canTransition(from: WorkOrderStatus, action: WorkOrderAction): boolean {
  return TRANSITIONS[from][action] !== undefined;
}

/** Actions a UI can offer for a work order in this status (e.g. which buttons to show). */
export function availableActions(from: WorkOrderStatus): WorkOrderAction[] {
  return Object.keys(TRANSITIONS[from]) as WorkOrderAction[];
}

export function isTerminal(status: WorkOrderStatus): boolean {
  return availableActions(status).length === 0;
}
