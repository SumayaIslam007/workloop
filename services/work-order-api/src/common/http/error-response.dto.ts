import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** The shape of every error response from this API. */
export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ example: 'Conflict' })
  error!: string;

  @ApiProperty({ example: 'Cannot cancel a work order that is APPROVED' })
  message!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['email must be an email'],
    description: 'Field-level validation messages, when the request body was invalid.',
  })
  details?: string[];

  @ApiProperty({ example: '/work-orders/3f1c.../cancel' })
  path!: string;

  @ApiProperty({ example: '6f0d1f0a-6a5e-4a53-9d0b-0c2b1c9f5a11' })
  requestId!: string;

  @ApiProperty({ example: '2026-09-16T10:15:30.000Z' })
  timestamp!: string;
}
