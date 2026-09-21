import { ApiProperty } from '@nestjs/swagger';
import { WorkOrderDto } from './work-order.dto';

export class PageMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedWorkOrdersDto {
  @ApiProperty({ type: [WorkOrderDto] })
  data!: WorkOrderDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
