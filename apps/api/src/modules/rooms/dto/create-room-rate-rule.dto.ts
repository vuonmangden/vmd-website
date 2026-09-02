import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateRoomRateRuleDto {
  @IsString() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) roomTypeId!: string;
  @IsString() @MaxLength(150) name!: string;
  @IsDateString() dateFrom!: string;
  @IsDateString() dateTo!: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) daysOfWeek?: number[];
  @IsString() @Matches(/^\d+$/) nightlyPrice!: string;
  @IsOptional() @IsString() @Matches(/^\d+$/) extraAdultPrice?: string;
  @IsOptional() @IsString() @Matches(/^\d+$/) extraChildPrice?: string;
  @IsOptional() @IsInt() @Min(1) minNights?: number;
  @IsOptional() @IsInt() @Min(1) maxNights?: number;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsIn(['STANDARD', 'HOLIDAY']) rateType?: 'STANDARD' | 'HOLIDAY';
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE']) status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}
