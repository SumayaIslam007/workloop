import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@workloop/shared-types';

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'maria@acme.test' })
  email!: string;

  @ApiProperty({ example: 'Maria Lopez' })
  name!: string;

  @ApiProperty({ enum: Object.values(UserRole), example: UserRole.BUYER })
  role!: UserRole;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  companyId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export function toUserDto(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  createdAt: Date;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    createdAt: user.createdAt,
  };
}
