import { IsDateString, IsInt, IsString, Matches, Min } from 'class-validator';

export class SandboxPriceQuoteDto {
  @IsString() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  declare roomTypeId: string;
  @IsDateString() declare dateFrom: string;
  @IsDateString() declare dateTo: string;
  @IsInt() @Min(1) declare adults: number;
  @IsInt() @Min(0) declare children: number;
}
