import { ApiProperty } from '@nestjs/swagger';
import { availableActions, WorkOrderAction, WorkOrderStatus } from '@workloop/shared-types';
import type { WorkOrder } from '../../generated/prisma/client';

export class WorkOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ example: 'Replace office network switch' })
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: 'Austin, TX' })
  location!: string;

  @ApiProperty({
    example: '65.50',
    description: 'Decimal string, so money is never rounded by floating-point maths.',
  })
  payRate!: string;

  @ApiProperty({ enum: Object.values(WorkOrderStatus), example: WorkOrderStatus.DRAFT })
  status!: WorkOrderStatus;

  @ApiProperty({
    enum: Object.values(WorkOrderAction),
    isArray: true,
    example: [WorkOrderAction.PUBLISH],
    description:
      'Lifecycle actions allowed from the current status (from the shared state machine).',
  })
  availableActions!: WorkOrderAction[];

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  technicianId!: string | null;

  @ApiProperty({ nullable: true, type: Date })
  scheduledAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export function toWorkOrderDto(order: WorkOrder): WorkOrderDto {
  return {
    id: order.id,
    companyId: order.companyId,
    title: order.title,
    description: order.description,
    location: order.location,
    payRate: order.payRate.toFixed(2),
    status: order.status,
    availableActions: availableActions(order.status),
    technicianId: order.technicianId,
    scheduledAt: order.scheduledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
