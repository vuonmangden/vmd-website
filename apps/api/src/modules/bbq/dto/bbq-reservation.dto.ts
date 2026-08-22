import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBbqReservationItemDto {
  @IsIn(['MENU_ITEM', 'COMBO'])
  declare type: 'MENU_ITEM' | 'COMBO';

  @IsString()
  @Length(2, 80)
  @Matches(/^[A-Z0-9_]+$/)
  declare code: string;

  @IsInt()
  @Min(1)
  @Max(999)
  declare quantity: number;
}

export class CreateBbqReservationDto {
  @IsUUID()
  declare customerId: string;

  @IsUUID()
  declare tableId: string;

  @IsDateString()
  declare date: string;

  @Matches(HH_MM)
  declare startTime: string;

  @Matches(HH_MM)
  declare endTime: string;

  @IsInt()
  @Min(1)
  declare adults: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateBbqReservationItemDto)
  items?: CreateBbqReservationItemDto[];

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  specialRequest?: string;

  // Capped short of resource_holds.idempotency_key's VARCHAR(150) so the
  // "bbq-reservation:" prefix (16 chars) never overflows it.
  @IsString()
  @MaxLength(120)
  declare idempotencyKey: string;
}

export class TransitionBbqReservationDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}
