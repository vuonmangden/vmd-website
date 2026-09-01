import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsDefined } from 'class-validator';
import { EDITABLE_SETTING_KEYS } from '../site-settings.constants';

export class UpdateSiteSettingDto {
  @ApiProperty({
    description: 'Site setting key. Only allow-listed CMS keys are accepted.',
    enum: EDITABLE_SETTING_KEYS as unknown as string[],
  })
  @IsIn(EDITABLE_SETTING_KEYS as string[])
  key!: string;

  @ApiProperty({
    description:
      'New value. A boolean for banner.enabled, otherwise a trimmed string.',
    oneOf: [{ type: 'string' }, { type: 'boolean' }],
  })
  @IsDefined()
  value!: unknown;
}
