import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  @MaxLength(180)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsInt()
  @Min(1)
  standardAdults!: number;

  @IsInt()
  @Min(1)
  maxAdults!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxChildren?: number;

  @IsInt()
  @Min(1)
  maxTotalGuests!: number;

  @IsOptional()
  @IsArray()
  bedConfiguration?: string[];

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE'])
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
