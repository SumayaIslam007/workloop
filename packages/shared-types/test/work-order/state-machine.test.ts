import {
  ALL_WORK_ORDER_ACTIONS,
  ALL_WORK_ORDER_STATUSES,
  InvalidTransitionError,
  WorkOrderAction as A,
  WorkOrderStatus as S,
  availableActions,
  canTransition,
  isTerminal,
  transition,
} from '../../src';
import type { WorkOrderAction, WorkOrderStatus } from '../../src';

/**
 * The expected legal transitions, written independently of the implementation's
 * table so a typo in one is caught by the other.
 */
const LEGAL: ReadonlyArray<[WorkOrderStatus, WorkOrderAction, WorkOrderStatus]> = [
  [S.DRAFT, A.PUBLISH, S.PUBLISHED],
  [S.PUBLISHED, A.ASSIGN, S.ASSIGNED],
  [S.PUBLISHED, A.CANCEL, S.CANCELLED],
  [S.ASSIGNED, A.START, S.IN_PROGRESS],
  [S.ASSIGNED, A.CANCEL, S.CANCELLED],
  [S.IN_PROGRESS, A.COMPLETE, S.COMPLETED],
  [S.IN_PROGRESS, A.CANCEL, S.CANCELLED],
  [S.COMPLETED, A.APPROVE, S.APPROVED],
];

const isLegal = (from: WorkOrderStatus, action: WorkOrderAction): boolean =>
  LEGAL.some(([f, a]) => f === from && a === action);

// Every (status, action) pair not in LEGAL — 7 statuses × 6 actions − 8 legal = 34 cases.
const ILLEGAL: Array<[WorkOrderStatus, WorkOrderAction]> = ALL_WORK_ORDER_STATUSES.flatMap((from) =>
  ALL_WORK_ORDER_ACTIONS.filter((action) => !isLegal(from, action)).map(
    (action): [WorkOrderStatus, WorkOrderAction] => [from, action],
  ),
);

describe('work order state machine', () => {
  describe('legal transitions', () => {
    it.each(LEGAL)('%s --%s--> %s', (from, action, expected) => {
      expect(transition(from, action)).toBe(expected);
      expect(canTransition(from, action)).toBe(true);
    });
  });

  describe('illegal transitions', () => {
    it('covers every remaining status/action pair', () => {
      expect(ILLEGAL).toHaveLength(
        ALL_WORK_ORDER_STATUSES.length * ALL_WORK_ORDER_ACTIONS.length - LEGAL.length,
      );
    });

    it.each(ILLEGAL)('%s --%s--> rejected', (from, action) => {
      expect(() => transition(from, action)).toThrow(InvalidTransitionError);
      expect(canTransition(from, action)).toBe(false);
    });
  });

  describe('InvalidTransitionError', () => {
    it('carries the attempted transition for error responses and logs', () => {
      const error = captureError(() => transition(S.APPROVED, A.CANCEL));

      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect(error).toMatchObject({
        name: 'InvalidTransitionError',
        from: S.APPROVED,
        action: A.CANCEL,
        message: 'Cannot cancel a work order that is APPROVED',
      });
    });
  });

  describe('availableActions', () => {
    it.each(ALL_WORK_ORDER_STATUSES)('matches the legal transitions from %s', (status) => {
      const expected = LEGAL.filter(([from]) => from === status).map(([, action]) => action);
      expect(availableActions(status).sort()).toEqual([...expected].sort());
    });
  });

  describe('isTerminal', () => {
    it('is true only for APPROVED and CANCELLED', () => {
      const terminal = ALL_WORK_ORDER_STATUSES.filter(isTerminal);
      expect(terminal.sort()).toEqual([S.APPROVED, S.CANCELLED].sort());
    });
  });

  it('can walk the full happy path from DRAFT to APPROVED', () => {
    const path = [A.PUBLISH, A.ASSIGN, A.START, A.COMPLETE, A.APPROVE];
    const final = path.reduce<WorkOrderStatus>(
      (status, action) => transition(status, action),
      S.DRAFT,
    );
    expect(final).toBe(S.APPROVED);
  });
});

function captureError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('Expected function to throw');
}
