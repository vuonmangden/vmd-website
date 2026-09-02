import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateRoomRateRuleDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) daysOfWeek?: number[];
  @IsOptional() @IsString() @Matches(/^\d+$/) nightlyPrice?: string;
  @IsOptional() @IsString() @Matches(/^\d+$/) extraAdultPrice?: string;
  @IsOptional() @IsString() @Matches(/^\d+$/) extraChildPrice?: string;
  @IsOptional() @IsInt() @Min(1) minNights?: number;
  @IsOptional() @IsInt() @Min(1) maxNights?: number | null;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsIn(['STANDARD', 'HOLIDAY']) rateType?: 'STANDARD' | 'HOLIDAY';
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE']) status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
