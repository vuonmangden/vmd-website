import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { MENU_GROUPS } from '../bbq-menu.service';

/** Money arrives as a digit string so a large VND amount never passes through a float. */
const VND_PATTERN = /^\d{1,12}$/;

export class UpsertMenuItemDto {
  @ApiProperty({ maxLength: 80 })
  @IsString()
  @Length(2, 80)
  @Matches(/^[A-Z0-9_]+$/, { message: 'code must be upper snake case' })
  code!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiProperty({ enum: MENU_GROUPS as unknown as string[] })
  @IsIn(MENU_GROUPS as unknown as string[])
  menuGroup!: string;

  @ApiProperty({ example: 'đĩa', maxLength: 20 })
  @IsString()
  @Length(1, 20)
  unit!: string;

  @ApiProperty({ example: '155000', description: 'Integer VND as a string.' })
  @Matches(VND_PATTERN, { message: 'price must be a non-negative integer VND amount' })
  price!: string;

  @ApiPropertyOptional({ description: 'Customer-facing description.' })
  @IsOptional()
  @IsString()
  @Length(1, 2_000)
  publicDescription?: string;

  @ApiPropertyOptional({ description: 'Staff-only note. Never returned publicly.' })
  @IsOptional()
  @IsString()
  @Length(1, 2_000)
  internalNote?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpsertComboDto {
  @ApiProperty({ maxLength: 80 })
  @IsString()
  @Length(2, 80)
  @Matches(/^[A-Z0-9_]+$/, { message: 'code must be upper snake case' })
  code!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiProperty({ example: '369000', description: 'Integer VND as a string.' })
  @Matches(VND_PATTERN, { message: 'price must be a non-negative integer VND amount' })
  price!: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minGuests?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;

  @ApiPropertyOptional({ description: 'What the set includes, as shown to guests.' })
  @IsOptional()
  @IsString()
  @Length(1, 2_000)
  composition?: string;

  @ApiPropertyOptional({ description: 'Staff-only note. Never returned publicly.' })
  @IsOptional()
  @IsString()
  @Length(1, 2_000)
  internalNote?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
