import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsUUID() roomTypeId!: string;
  @IsString() @MaxLength(50) code!: string;
  @IsString() @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(50) floor?: string;
  @IsOptional() @IsString() @MaxLength(100) areaZone?: string;
  @IsOptional() @IsIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE']) status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  @IsOptional() @IsString() @MaxLength(2000) maintenanceNotes?: string;
}
