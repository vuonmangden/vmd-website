import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBbqAreaDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsInt()
  @Min(1)
  minCapacity!: number;

  @IsInt()
  @Min(1)
  maxCapacity!: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateBbqAreaDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateBbqTableDto {
  @IsUUID()
  areaId!: string;

  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Min(1)
  minCapacity!: number;

  @IsInt()
  @Min(1)
  maxCapacity!: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsInt()
  @Min(0)
  turnaroundMinutes?: number;
}

export class UpdateBbqTableDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsInt()
  @Min(0)
  turnaroundMinutes?: number;
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBbqServiceSlotDto {
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @Matches(HH_MM)
  startTime!: string;

  @IsString()
  @Matches(HH_MM)
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  bookingIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxTotalGuests?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateBbqServiceSlotDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(HH_MM)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(HH_MM)
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  bookingIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxTotalGuests?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
