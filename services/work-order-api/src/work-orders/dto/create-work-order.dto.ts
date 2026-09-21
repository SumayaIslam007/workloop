import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'Replace office network switch', maxLength: 160 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @ApiProperty({
    example: 'Swap the failed 24-port switch in the server room and verify all drops.',
    maxLength: 5000,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: 'Austin, TX', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location!: string;

  @ApiProperty({ example: 65.5, description: 'Hourly pay rate in USD, up to 2 decimal places.' })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(10000)
  payRate!: number;

  @ApiPropertyOptional({ example: '2026-10-01T09:00:00.000Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
