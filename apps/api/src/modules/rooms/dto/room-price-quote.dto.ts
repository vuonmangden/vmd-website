import { IsDateString, IsInt, IsString, Matches, Min } from 'class-validator';

export class RoomPriceQuoteDto {
  @IsString() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) roomTypeId!: string;
  @IsDateString() dateFrom!: string;
  @IsDateString() dateTo!: string;
  @IsInt() @Min(1) adults!: number;
  @IsInt() @Min(0) children!: number;
}
