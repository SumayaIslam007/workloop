/**
 * Lifecycle states of a work order.
 *
 * Declared as a const object (not a TS `enum`) so the values are plain strings
 * that serialise cleanly to JSON, MySQL and RabbitMQ payloads.
 */
export const WorkOrderStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  APPROVED: 'APPROVED',
  CANCELLED: 'CANCELLED',
} as const;

export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

/**
 * Commands that move a work order between states.
 *
 * Note: "apply" is deliberately absent. A technician applying creates an
 * `Application` row; it does not change the work order's status.
 */
export const WorkOrderAction = {
  PUBLISH: 'publish',
  ASSIGN: 'assign',
  START: 'start',
  COMPLETE: 'complete',
  APPROVE: 'approve',
  CANCEL: 'cancel',
} as const;

export type WorkOrderAction = (typeof WorkOrderAction)[keyof typeof WorkOrderAction];

export const ALL_WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = Object.values(WorkOrderStatus);
export const ALL_WORK_ORDER_ACTIONS: readonly WorkOrderAction[] = Object.values(WorkOrderAction);
