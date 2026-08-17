import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { STAFF_STATUSES } from '../staff-management.service';

export class ChangeStaffStatusDto {
  @ApiProperty({ enum: STAFF_STATUSES as unknown as string[] })
  @IsIn(STAFF_STATUSES as unknown as string[])
  status!: string;

  @ApiPropertyOptional({ maxLength: 500, description: 'Recorded on the audit trail.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'System role code, for example SUPER_ADMIN or RECEPTION.' })
  @IsString()
  @Length(2, 50)
  roleCode!: string;
}
