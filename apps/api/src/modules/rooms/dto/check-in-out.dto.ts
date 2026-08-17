import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CheckInOutDto {
  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Front-desk note recorded on the status history and audit trail.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}
