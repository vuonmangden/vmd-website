import { IsDateString, IsInt, IsString, Matches, Min } from 'class-validator';

export class PublicRoomAvailabilityDto {
  @IsDateString() declare checkIn: string;
  @IsDateString() declare checkOut: string;
  @IsInt() @Min(1) declare guests: number;
}

export class PublicRoomQuoteDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) declare slug: string;
  @IsDateString() declare dateFrom: string;
  @IsDateString() declare dateTo: string;
  @IsInt() @Min(1) declare adults: number;
  @IsInt() @Min(0) declare children: number;
}
