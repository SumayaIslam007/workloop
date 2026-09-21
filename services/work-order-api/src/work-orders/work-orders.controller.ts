import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@workloop/shared-types';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser, Roles } from '../common/auth/decorators';
import { ErrorResponseDto } from '../common/http/error-response.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { PaginatedWorkOrdersDto } from './dto/paginated-work-orders.dto';
import { WorkOrderDto } from './dto/work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('work-orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Post()
  @Roles(UserRole.BUYER)
  @ApiCreatedResponse({ type: WorkOrderDto, description: 'Created as a DRAFT for your company' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Only buyers can create work orders',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkOrderDto,
  ): Promise<WorkOrderDto> {
    return this.workOrders.create(user, dto);
  }

  @Get()
  @ApiOkResponse({
    type: PaginatedWorkOrdersDto,
    description:
      'Buyers see their company’s orders; technicians see published orders and orders assigned to them.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWorkOrdersQueryDto,
  ): Promise<PaginatedWorkOrdersDto> {
    return this.workOrders.list(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: WorkOrderDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<WorkOrderDto> {
    return this.workOrders.findOne(user, id);
  }
}
