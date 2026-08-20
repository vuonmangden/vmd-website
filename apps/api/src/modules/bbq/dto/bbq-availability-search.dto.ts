import { IsDateString, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class BbqAvailabilitySearchDto {
  @IsDateString()
  declare date: string;

  @Matches(HH_MM)
  declare startTime: string;

  @Matches(HH_MM)
  declare endTime: string;

  @IsInt()
  @Min(1)
  declare guests: number;

  @IsOptional()
  @IsUUID()
  declare areaId?: string;
}
