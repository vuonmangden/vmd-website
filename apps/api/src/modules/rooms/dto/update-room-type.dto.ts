import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRoomTypeDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(180) slug?: string;
  @IsOptional() @IsString() @MaxLength(1000) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsInt() @Min(1) standardAdults?: number;
  @IsOptional() @IsInt() @Min(1) maxAdults?: number;
  @IsOptional() @IsInt() @Min(0) maxChildren?: number;
  @IsOptional() @IsInt() @Min(1) maxTotalGuests?: number;
  @IsOptional() @IsArray() bedConfiguration?: string[];
  @IsOptional() @IsArray() amenities?: string[];
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE']) status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
