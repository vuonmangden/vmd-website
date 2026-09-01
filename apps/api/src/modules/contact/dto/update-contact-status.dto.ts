import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { CONTACT_STATUSES } from '../contact.service';

export class UpdateContactStatusDto {
  @ApiProperty({ enum: CONTACT_STATUSES as unknown as string[] })
  @IsIn(CONTACT_STATUSES as unknown as string[])
  status!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2_000)
  internalNote?: string;
}
