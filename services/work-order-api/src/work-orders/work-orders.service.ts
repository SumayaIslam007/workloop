import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, WorkOrderStatus } from '@workloop/shared-types';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateWorkOrderDto } from './dto/create-work-order.dto';
import type { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import type { PaginatedWorkOrdersDto } from './dto/paginated-work-orders.dto';
import { toWorkOrderDto, type WorkOrderDto } from './dto/work-order.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateWorkOrderDto): Promise<WorkOrderDto> {
    if (!user.companyId) {
      throw new ForbiddenException('You must belong to a company to create work orders');
    }

    const order = await this.prisma.workOrder.create({
      data: {
        companyId: user.companyId,
        createdById: user.id,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        payRate: dto.payRate.toFixed(2),
        status: WorkOrderStatus.DRAFT,
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
      },
    });
    return toWorkOrderDto(order);
  }

  async list(
    user: AuthenticatedUser,
    query: ListWorkOrdersQueryDto,
  ): Promise<PaginatedWorkOrdersDto> {
    const where = visibleTo(user);
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      data: orders.map(toWorkOrderDto),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<WorkOrderDto> {
    // Orders the user may not see return 404, not 403, so their existence isn't revealed.
    const order = await this.prisma.workOrder.findFirst({
      where: { AND: [{ id }, visibleTo(user)] },
    });
    if (!order) {
      throw new NotFoundException('Work order not found');
    }
    return toWorkOrderDto(order);
  }
}

/**
 * Who can see which work orders:
 * - buyers: every order of their own company, in any status
 * - technicians: published orders (the marketplace) and orders assigned to them
 * - admins: everything
 */
export function visibleTo(user: AuthenticatedUser): Prisma.WorkOrderWhereInput {
  switch (user.role) {
    case UserRole.ADMIN:
      return {};
    case UserRole.BUYER:
      // A buyer without a company matches nothing.
      return { companyId: user.companyId ?? '' };
    case UserRole.TECHNICIAN:
      return { OR: [{ status: WorkOrderStatus.PUBLISHED }, { technicianId: user.id }] };
  }
}
