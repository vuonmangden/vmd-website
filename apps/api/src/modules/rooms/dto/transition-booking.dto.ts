import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class TransitionBookingDto {
  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Required when cancelling; recorded on the audit trail.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}

export class ConfirmBookingDto extends TransitionBookingDto {}

export class CancelBookingDto {
  @ApiProperty({ maxLength: 500, description: 'Why the booking is being cancelled.' })
  @IsString()
  @Length(1, 500)
  reason!: string;
}
