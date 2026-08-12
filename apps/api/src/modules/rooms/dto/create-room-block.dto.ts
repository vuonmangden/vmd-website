import { IsDateString, IsString, Matches, MaxLength } from 'class-validator';

export class CreateRoomBlockDto {
  @IsDateString()
  declare startDate: string;

  @IsDateString()
  declare endDate: string;

  @IsString()
  @MaxLength(2000)
  declare reason: string;

  @IsString()
  @Matches(/^[A-Z_]{1,30}$/)
  declare blockType: string;
}
