import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SELF_REGISTRATION_ROLES,
  type SelfRegistrationRole,
  UserRole,
} from '@workloop/shared-types';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @ApiProperty({ example: 'maria@acme.test' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 8,
    description: 'At least 8 characters, including a letter and a number.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'password must contain a letter and a number' })
  password!: string;

  @ApiProperty({ example: 'Maria Lopez' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: SELF_REGISTRATION_ROLES, example: UserRole.BUYER })
  @IsIn(SELF_REGISTRATION_ROLES)
  role!: SelfRegistrationRole;

  @ApiPropertyOptional({
    example: 'Acme Facilities',
    description: 'Required when role is buyer. A company is created and owned by the new user.',
  })
  @ValidateIf((dto: RegisterDto) => dto.role === UserRole.BUYER)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'companyName is required for buyers' })
  @MaxLength(160)
  companyName?: string;
}
