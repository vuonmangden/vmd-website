import { IsDateString, IsInt, Min } from 'class-validator';

export class AvailabilitySearchDto {
  @IsDateString() declare checkIn: string;
  @IsDateString() declare checkOut: string;
  @IsInt() @Min(1) declare guests: number;
}
