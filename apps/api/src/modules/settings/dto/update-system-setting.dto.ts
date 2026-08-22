import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsIn, IsISO8601, IsOptional } from 'class-validator';
import { SYSTEM_SETTING_KEYS } from '../system-settings.constants';

export class UpdateSystemSettingDto {
  @ApiProperty({
    description: 'System setting key. Only allow-listed technical/operational keys are accepted.',
    enum: SYSTEM_SETTING_KEYS as unknown as string[],
  })
  @IsIn(SYSTEM_SETTING_KEYS as string[])
  key!: string;

  @ApiProperty({
    description: 'New value. Shape depends on key: a string for app.name, {hours} for payment.expiry_hours.*, {amount} for bbq.deposit_amount_per_table.',
    oneOf: [{ type: 'string' }, { type: 'object' }],
  })
  @IsDefined()
  value!: unknown;

  @ApiPropertyOptional({
    description:
      'Optimistic concurrency guard: the updatedAt value last read for this key (ISO 8601). If provided and the setting has changed since, the request fails with 409 RESOURCE_VERSION_CONFLICT instead of overwriting a concurrent change.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
